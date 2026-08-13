#!/usr/bin/env python3
"""
mcnames.py — varredura de nicknames livres no Minecraft (Java).

Duas etapas:

  1) lookup em LOTE (sem autenticacao, 10 nomes por requisicao) para
     descobrir quais nomes NAO tem conta associada -> "candidatos".

  2) verify (autenticado, /available) para separar AVAILABLE (realmente
     livre) de NOT_ALLOWED (bloqueado pelo filtro / em cooldown).

NOVIDADES desta versao
----------------------
  * --length aceita faixa:  4  |  3-6  |  all  (all = 3..16)
  * --pattern CVCV : gera/filtra por forma fonetica (c=consoante, v=vogal,
    l=letra, d=digito, x=qualquer, ou o literal). Ex: cvcv, ccvc, cvvc.
  * --markov N : gera N nomes "que parecem palavra" com um modelo de
    caracteres treinado no proprio dicionario. Resolve o problema de so
    existirem ~30 palavras reais de 4 letras nao registradas.
  * --badwords en,pt : bloqueia palavrao ANTES de gastar requisicao.
    Entende leetspeak (sh1t, f0da) e repeticao (fuuck). Sem isso metade
    das palavras do dicionario ingles vira NOT_ALLOWED garantido.
  * --clean / --pronounceable : filtros de formato, tambem no verify.
  * lote com HTTP 400 agora e dividido ao meio em vez de descartado.

IMPORTANTE — leia antes de rodar:

  * Ausencia no lookup em lote NAO significa "liberado". Significa apenas
    "nenhuma conta usa esse nome agora". Pode ser um nome bloqueado pelo
    filtro de palavroes, reservado, ou em cooldown de 37 dias apos troca.
    So a etapa 2 confirma.

  * Limites (fonte: minecraft.wiki/w/Mojang_API, ago/2026):
      - maioria da API: 200 req / 2 min por IP (IPv6: por bloco /56)
      - /available:     20 req / 5 min por CONTA (nao por IP)
    O default deste script e conservador (150 req / 2 min). Nao aumente
    sem necessidade: excesso de 429 pode levar a suspensao temporaria de
    conta em endpoints autenticados.

  * O progresso e salvo em SQLite. Pode interromper com Ctrl+C e retomar
    depois com o mesmo comando — ele continua de onde parou.

Uso:
    pip install aiohttp

    # ver o que seria gerado, sem tocar na API
    python mcnames.py preview --length 4 --pattern cvcv --badwords en,pt

    # amostra completa: dicionario + leet + fonetico + markov
    python mcnames.py quick --db final.db --length 3-5 \
        --words en,pt --leet --leet-max 6 \
        --pattern cvcv --markov 4000 --badwords en,pt

    python mcnames.py stats  --db final.db
    python mcnames.py verify --db final.db --token "<bearer>" --clean --limit 200
    python mcnames.py export --db final.db --out livres.txt --verified-only
"""

from __future__ import annotations

import argparse
import asyncio
import collections
import inspect
import itertools
import math
import os
import random
import re
import signal
import sqlite3
import string
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from typing import Callable, Iterable, Iterator, Sequence

try:
    import aiohttp
except ImportError:  # pragma: no cover
    sys.exit("Falta a dependencia: pip install aiohttp")


# --------------------------------------------------------------------------- #
# Configuracao
# --------------------------------------------------------------------------- #

BULK_ENDPOINTS = {
    "services": "https://api.minecraftservices.com/minecraft/profile/lookup/bulk/byname",
    "mojang": "https://api.mojang.com/minecraft/profile/lookup/bulk/byname",
    "legacy": "https://api.mojang.com/profiles/minecraft",
}
AVAILABLE_ENDPOINT = "https://api.minecraftservices.com/minecraft/profile/name/{name}/available"

BULK_MAX = 10            # limite duro da Mojang: 1..10 nomes por payload
MC_MIN_LEN = 3           # minimo aceito pela Mojang hoje
MC_MAX_LEN = 16          # maximo
DEFAULT_LENGTH = "4"

NAME_CHARS = string.ascii_lowercase + string.digits + "_"
NAME_RE = re.compile(rf"^[a-z0-9_]{{{MC_MIN_LEN},{MC_MAX_LEN}}}$")

VOWELS = "aeiou"
CONSONANTS = "".join(c for c in string.ascii_lowercase if c not in VOWELS)

ALPHABETS = {
    # Nomes sao unicos de forma case-insensitive, entao varrer apenas
    # minusculas ja cobre 100% do espaco.
    "full": string.ascii_lowercase + string.digits + "_",   # 37
    "alnum": string.ascii_lowercase + string.digits,        # 36
    "letters": string.ascii_lowercase,                      # 26
    "digits": string.digits,                                # 10
}

USER_AGENT = "mcnames/2.0 (+github.com/local; contato: seu-email@exemplo.com)"

WORDLIST_URLS = {
    "en": "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt",
    "pt": "https://raw.githubusercontent.com/pythonprobr/palavras/master/palavras.txt",
}

# Lista mantida pela comunidade (LDNOOBW), usada pela Shutterstock e outros.
# Baixada uma vez e guardada em cache junto com os dicionarios.
BADWORD_URLS = {
    "en": "https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en",
    "pt": "https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/pt",
    "es": "https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/es",
    "fr": "https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/fr",
    "de": "https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/de",
}

# Nucleo embutido, para funcionar mesmo offline. A lista baixada cobre o
# resto (incluindo termos ofensivos que nao vale a pena versionar aqui).
BUILTIN_BADWORDS = {
    # ingles
    "anal", "anus", "arse", "ass", "bitch", "boob", "butt", "clit", "cock",
    "crap", "cum", "cunt", "dick", "dildo", "fuck", "jizz", "nazi", "penis",
    "piss", "poop", "porn", "pube", "pussy", "rape", "scat", "semen", "sex",
    "shit", "slut", "suck", "tit", "turd", "twat", "vagin", "wank", "whore",
    "xxx",
    # portugues
    "boceta", "bosta", "buceta", "cacete", "caralho", "chupa", "corno",
    "foda", "foder", "merda", "pinto", "piroca", "porra", "punheta", "puta",
    "puto", "rola", "tesao", "viado", "xoxota",
}

# Problema de Scunthorpe: termos curtos gerando falso positivo.
BUILTIN_ALLOWLIST = {
    "pass", "bass", "mass", "lass", "sass", "cass", "tass", "wass", "hass",
    "bras", "brass", "class", "grass", "glass", "asset", "assai",
    "tito", "tita", "titi", "titan", "paus", "pauta", "cuia", "cume",
    "cura", "cuca", "curo", "cuco", "suco", "sucr", "asso", "assa",
}


# --------------------------------------------------------------------------- #
# Comprimento
# --------------------------------------------------------------------------- #

def parse_lengths(spec) -> list[int]:
    """'4' -> [4] | '3-6' -> [3,4,5,6] | 'all' -> [3..16] | '3,5,7' -> [3,5,7]"""
    if isinstance(spec, int):
        spec = str(spec)
    spec = str(spec).strip().lower()
    if spec in ("all", "todos", "tudo", "*"):
        return list(range(MC_MIN_LEN, MC_MAX_LEN + 1))

    out: set[int] = set()
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part or ":" in part:
            sep = "-" if "-" in part else ":"
            a, b = part.split(sep, 1)
            try:
                lo, hi = int(a), int(b)
            except ValueError:
                raise SystemExit(f"Faixa invalida: {part!r}. Use algo como 3-6.")
            if lo > hi:
                lo, hi = hi, lo
            out.update(range(lo, hi + 1))
        else:
            try:
                out.add(int(part))
            except ValueError:
                raise SystemExit(f"Comprimento invalido: {part!r}")

    bad = [n for n in out if not (MC_MIN_LEN <= n <= MC_MAX_LEN)]
    if bad:
        raise SystemExit(
            f"Comprimento fora do permitido pela Mojang ({MC_MIN_LEN}..{MC_MAX_LEN}): {sorted(bad)}")
    if not out:
        raise SystemExit("Nenhum comprimento valido informado.")
    return sorted(out)


def fmt_lengths(lengths: Sequence[int]) -> str:
    if len(lengths) == 1:
        return str(lengths[0])
    if lengths == list(range(lengths[0], lengths[-1] + 1)):
        return f"{lengths[0]}-{lengths[-1]}"
    return ",".join(map(str, lengths))


def valid_name(name: str) -> bool:
    return bool(NAME_RE.match(name))


# --------------------------------------------------------------------------- #
# Formato fonetico: padroes e pronunciabilidade
# --------------------------------------------------------------------------- #

PATTERN_CLASSES = {
    "c": CONSONANTS,
    "v": VOWELS,
    "l": string.ascii_lowercase,
    "d": string.digits,
    "x": NAME_CHARS,
}

# Encurtadores uteis, aceitos onde um padrao e esperado.
PATTERN_ALIASES = {
    "clean": None,          # tratado a parte: so letras
    "pronunciavel": None,   # idem
    "pronounceable": None,
}


def _pattern_slots(pattern: str) -> list[str]:
    slots = []
    for ch in pattern.strip().lower():
        if ch in PATTERN_CLASSES:
            slots.append(PATTERN_CLASSES[ch])
        elif ch in NAME_CHARS:
            slots.append(ch)          # literal
        else:
            raise SystemExit(
                f"Caractere de padrao desconhecido: {ch!r}. "
                f"Use c/v/l/d/x ou um literal a-z 0-9 _")
    return slots


def pattern_space(pattern: str) -> int:
    return math.prod(len(s) for s in _pattern_slots(pattern))


def iter_pattern(pattern: str) -> Iterator[str]:
    """Todos os nomes que casam com o padrao, em ordem lexicografica."""
    slots = _pattern_slots(pattern)
    for combo in itertools.product(*slots):
        yield "".join(combo)


def sample_pattern(pattern: str, n: int, rng: random.Random) -> list[str]:
    """n nomes sorteados do padrao, sem materializar o espaco todo."""
    slots = _pattern_slots(pattern)
    space = math.prod(len(s) for s in slots)
    if n >= space:
        return sorted(set(iter_pattern(pattern)))
    out: set[str] = set()
    tries = 0
    while len(out) < n and tries < n * 500:
        out.add("".join(rng.choice(s) for s in slots))
        tries += 1
    return sorted(out)


def match_pattern(name: str, pattern: str) -> bool:
    slots = _pattern_slots(pattern)
    if len(name) != len(slots):
        return False
    return all(ch in slot for ch, slot in zip(name.lower(), slots))


# Clusters de consoantes. A POSICAO importa: 'bb' existe em 'abbey' mas
# nenhuma palavra comeca com 'bb'. Separar isso e o que impede o gerador
# de padrao CCVC de cuspir 'bbab', 'ffup', 'zzat'.

# Podem ABRIR uma palavra.
ONSETS_2 = {
    "bl", "br", "ch", "cl", "cr", "dr", "dw", "fl", "fr", "gl", "gn", "gr",
    "kl", "kn", "kr", "kw", "ph", "pl", "pr", "ps", "qu", "rh", "sc", "sh",
    "sk", "sl", "sm", "sn", "sp", "st", "sv", "sw", "th", "tr", "ts", "tw",
    "vl", "vr", "wh", "wr", "zh",
}
ONSETS_3 = {"chr", "phr", "sch", "scr", "shr", "spl", "spr", "str", "thr"}

# Podem FECHAR uma palavra.
CODAS_2 = {
    "ch", "ck", "ct", "ff", "ft", "gs", "ks", "ld", "lf", "lk", "ll", "lm",
    "lp", "ls", "lt", "mb", "mp", "ms", "nc", "nd", "ng", "nk", "ns", "nt",
    "ph", "ps", "pt", "rb", "rc", "rd", "rf", "rg", "rk", "rl", "rm", "rn",
    "rp", "rs", "rt", "rv", "sh", "sk", "sm", "sp", "ss", "st", "th", "ts",
    "tt", "xt", "zz", "ds", "bs", "nh", "lh", "nx", "rx", "lx", "gh", "gn",
}
CODAS_3 = {
    "cks", "cts", "lds", "lks", "lts", "mps", "nch", "nds", "ngs", "nks",
    "nts", "rch", "rds", "rks", "rms", "rns", "rps", "rst", "rth", "rts",
    "sks", "sps", "sts", "pts", "lms", "lps",
}

# Geminadas e outros encontros que so existem NO MEIO.
MEDIAL_ONLY_2 = {
    "bb", "cc", "dd", "gg", "mm", "nn", "pp", "rr", "tt", "ff", "ll", "ss",
    "zz", "mn", "tl", "dl", "gm", "bt", "pn", "km", "sb", "sd", "sg", "sq",
    "rq", "lc", "lg", "lv", "lb", "nf", "nv", "nz", "rz", "lz", "sn", "sm",
}
MEDIAL_2 = ONSETS_2 | CODAS_2 | MEDIAL_ONLY_2
MEDIAL_3 = ONSETS_3 | CODAS_3 | {
    "ldr", "mbr", "mpl", "mpr", "ncr", "ndr", "ngr", "nkl", "nst", "ntr",
    "rbl", "rgr", "rpr", "rtr", "ktr", "str", "mbl", "ngl", "rfl", "rkl",
}

# 'y' funciona como vogal em myth, sync, hype, lynx. Tratar como consoante
# rejeitava esses nicks — que sao justamente os bons.
VOWELS_SOFT = VOWELS + "y"

# Encontros vocalicos que nao existem.
BAD_VOWEL_2 = {"aa", "ii", "uu", "yy", "iy", "yi", "uy", "yu"}
VOWEL_RUNS_3 = {
    "eau", "iou", "eou", "aia", "eia", "oia", "uia", "aio", "eio", "uai",
    "uei", "iei", "oai", "eau", "aiu", "eua",
}


def is_pronounceable(name: str) -> bool:
    """Heuristica: da pra falar isso em voz alta sem soletrar?

    Checa cada bloco de consoantes contra a lista certa para a POSICAO em
    que ele aparece: inicio, meio ou fim da palavra."""
    n = name.lower()
    if not n.isalpha():
        return False
    if not any(c in VOWELS_SOFT for c in n):
        return False

    runs = [("".join(g), is_v)
            for is_v, g in itertools.groupby(n, key=lambda c: c in VOWELS_SOFT)]
    last = len(runs) - 1

    for i, (run, is_vowel) in enumerate(runs):
        if is_vowel:
            if len(run) == 2 and run in BAD_VOWEL_2:
                return False
            if len(run) == 3 and run not in VOWEL_RUNS_3:
                return False
            if len(run) > 3:
                return False
            continue

        if len(run) == 1:
            continue
        if len(run) > 3:
            return False

        inicio, fim = i == 0, i == last
        if inicio and fim:
            return False                      # nome so de consoante
        if inicio:
            allowed = ONSETS_2 if len(run) == 2 else ONSETS_3
        elif fim:
            allowed = CODAS_2 if len(run) == 2 else CODAS_3
        else:
            allowed = MEDIAL_2 if len(run) == 2 else MEDIAL_3
        if run not in allowed:
            return False

    return True


# --------------------------------------------------------------------------- #
# Filtro de palavrao
# --------------------------------------------------------------------------- #

# So mapeamentos que levam a caracteres validos de nick.
DELEET = {
    "0": ["o"],
    "1": ["i", "l"],
    "2": ["z"],
    "3": ["e"],
    "4": ["a"],
    "5": ["s"],
    "6": ["g"],
    "7": ["t"],
    "8": ["b"],
    "9": ["g"],
    "_": [""],
}
MAX_DELEET_VARIANTS = 96


def deleet_variants(name: str) -> set[str]:
    """'sh1t' -> {'sh1t','shit','shlt'}. Cobre a ofuscacao mais comum."""
    variants = {name}
    slots = [DELEET.get(ch, [ch]) for ch in name]
    if math.prod(len(s) for s in slots) <= MAX_DELEET_VARIANTS:
        for combo in itertools.product(*slots):
            variants.add("".join(combo))
    else:
        # nome longo demais: usa apenas a traducao canonica (primeira opcao)
        variants.add("".join(s[0] for s in slots))
    # versao com repeticoes colapsadas: fuuuck -> fuck
    extra = {re.sub(r"(.)\1+", r"\1", v) for v in variants}
    return {v for v in variants | extra if v}


class BadWords:
    """Bloqueia nomes que o filtro da Mojang quase certamente vai recusar.

    modo:
      strict — qualquer termo como substring
      smart  — termos de 4+ caracteres como substring; termos de 3 apenas
               se forem o nome inteiro ou estiverem na borda de um nome
               curto. Evita bloquear 'pass' por causa de 'ass'.  (default)
      off    — desligado
    """

    def __init__(self, terms: Iterable[str], mode: str = "smart",
                 allow: Iterable[str] = ()):
        self.mode = mode
        self.allow = {a.lower() for a in allow}
        self.short: set[str] = set()
        self.long: set[str] = set()
        for raw in terms:
            t = strip_accents(raw.strip().lower())
            t = "".join(c for c in t if c.isalnum())
            if len(t) < 3:
                continue          # 'cu', 'pq' etc geram falso positivo demais
            (self.short if len(t) == 3 else self.long).add(t)

    def __len__(self) -> int:
        return len(self.short) + len(self.long)

    def hit(self, name: str) -> str | None:
        """Devolve o termo que casou, ou None se o nome esta limpo."""
        if self.mode == "off":
            return None
        low = name.lower()
        if low in self.allow:
            return None

        for variant in deleet_variants(low):
            if variant in self.allow:
                continue
            for term in self.long:
                if term in variant:
                    return term
            for term in self.short:
                if variant == term:
                    return term
                if self.mode == "strict":
                    if term in variant:
                        return term
                elif len(variant) <= 4 and (variant.startswith(term)
                                            or variant.endswith(term)):
                    return term
        return None

    # -- construcao -------------------------------------------------------- #

    @classmethod
    def load(cls, langs: str | None, cache_dir: str, mode: str = "smart",
             extra_file: str | None = None,
             allow_file: str | None = None,
             quiet: bool = False) -> "BadWords":
        if not langs or mode == "off":
            return cls((), mode="off")

        terms = set(BUILTIN_BADWORDS)
        for lang in (s.strip() for s in langs.split(",") if s.strip()):
            url = BADWORD_URLS.get(lang)
            if not url:
                print(f"  aviso: sem lista de palavrao para '{lang}' "
                      f"(disponiveis: {', '.join(BADWORD_URLS)})")
                continue
            raw = _cached_download(url, cache_dir, f"bad_{lang}.txt",
                                   label=f"palavrao '{lang}'", quiet=quiet)
            if raw:
                terms.update(raw.split("\n"))

        if extra_file:
            terms.update(open(extra_file, encoding="utf-8").read().split())

        allow = set(BUILTIN_ALLOWLIST)
        if allow_file:
            allow.update(w.strip().lower()
                         for w in open(allow_file, encoding="utf-8").read().split())

        bw = cls(terms, mode=mode, allow=allow)
        if not quiet:
            print(f"  filtro de palavrao: {len(bw):,} termos, modo '{mode}'")
        return bw


def _cached_download(url: str, cache_dir: str, filename: str,
                     label: str = "", quiet: bool = False) -> str:
    os.makedirs(cache_dir, exist_ok=True)
    path = os.path.join(cache_dir, filename)
    if os.path.exists(path):
        return open(path, encoding="utf-8").read()
    if not quiet:
        print(f"  baixando lista {label}...", flush=True)
    try:
        with urllib.request.urlopen(url, timeout=120) as resp:
            raw = resp.read().decode("utf-8", "replace")
    except (urllib.error.URLError, OSError) as exc:
        print(f"  aviso: falha ao baixar {label}: {exc}")
        return ""
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(raw)
    return raw


# --------------------------------------------------------------------------- #
# Rate limiter (janela deslizante) com pausa global em 429
# --------------------------------------------------------------------------- #

class RateLimiter:
    """Janela deslizante: no maximo `max_calls` inicios de requisicao a cada
    `period` segundos. Suporta uma pausa global acionada por 429."""

    def __init__(self, max_calls: int, period: float):
        self.max_calls = max_calls
        self.period = period
        self._hits: collections.deque[float] = collections.deque()
        self._lock = asyncio.Lock()
        self._paused_until = 0.0
        self.throttle_events = 0

    async def acquire(self) -> None:
        while True:
            async with self._lock:
                now = time.monotonic()
                if now < self._paused_until:
                    wait = self._paused_until - now
                else:
                    while self._hits and now - self._hits[0] >= self.period:
                        self._hits.popleft()
                    if len(self._hits) < self.max_calls:
                        self._hits.append(now)
                        return
                    wait = self.period - (now - self._hits[0]) + 0.01
            await asyncio.sleep(wait)

    async def pause(self, seconds: float) -> None:
        """Trava todos os workers por `seconds`. Chamado ao receber 429."""
        async with self._lock:
            self.throttle_events += 1
            target = time.monotonic() + seconds
            self._paused_until = max(self._paused_until, target)
            self._hits.clear()


# --------------------------------------------------------------------------- #
# Persistencia
# --------------------------------------------------------------------------- #

SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS done_chunks (idx INTEGER PRIMARY KEY);
CREATE TABLE IF NOT EXISTS candidates (
    name     TEXT PRIMARY KEY,
    verified TEXT DEFAULT NULL,  -- NULL | AVAILABLE | NOT_ALLOWED | DUPLICATE
    origin   TEXT DEFAULT NULL,  -- word:xx | leet:palavra | pattern:cvcv
                                 -- markov | random | scan
    len      INTEGER DEFAULT NULL
);
CREATE TABLE IF NOT EXISTS sampled (
    name    TEXT PRIMARY KEY,
    checked INTEGER DEFAULT 0,   -- 0 = ainda nao passou pelo lookup em lote
    origin  TEXT DEFAULT NULL,
    len     INTEGER DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_cand_pend ON candidates(verified, origin);
CREATE INDEX IF NOT EXISTS idx_samp_pend ON sampled(checked);
"""

# ordem de interesse: palavra real > markov > padrao fonetico > leet > resto
PRIORITY_SQL = (
    "CASE WHEN origin LIKE 'word:%'    THEN 0 "
    "     WHEN origin = 'markov'       THEN 1 "
    "     WHEN origin LIKE 'pattern:%' THEN 2 "
    "     WHEN origin LIKE 'leet:%'    THEN 3 "
    "     ELSE 4 END"
)


class Store:
    def __init__(self, path: str):
        self.conn = sqlite3.connect(path)
        self.conn.executescript(SCHEMA)
        self.conn.execute("PRAGMA journal_mode=WAL")
        self._migrate()
        self.conn.commit()

    def _migrate(self) -> None:
        """Bancos criados pela v1 nao tem a coluna `len`."""
        for table in ("candidates", "sampled"):
            cols = {r[1] for r in self.conn.execute(f"PRAGMA table_info({table})")}
            if "len" not in cols:
                self.conn.execute(f"ALTER TABLE {table} ADD COLUMN len INTEGER")
                self.conn.execute(f"UPDATE {table} SET len = LENGTH(name)")
            if "origin" not in cols:
                self.conn.execute(f"ALTER TABLE {table} ADD COLUMN origin TEXT")
        self.conn.execute("UPDATE candidates SET len = LENGTH(name) WHERE len IS NULL")
        self.conn.execute("UPDATE sampled SET len = LENGTH(name) WHERE len IS NULL")

    # -- meta -------------------------------------------------------------- #

    def bind_run(self, alphabet: str, lengths: Sequence[int]) -> None:
        """Trava os parametros do `scan`, para o resume nao misturar dois
        espacos diferentes no mesmo banco (os indices de lote colidiriam)."""
        existing = dict(self.conn.execute("SELECT k, v FROM meta").fetchall())
        want = {"alphabet": alphabet,
                "lengths": fmt_lengths(list(lengths)),
                "bulk": str(BULK_MAX)}
        if existing:
            # compatibilidade com bancos da v1 (chave 'length')
            if "length" in existing and "lengths" not in existing:
                existing["lengths"] = existing.pop("length")
            if existing != want:
                raise SystemExit(
                    f"Este banco foi criado com parametros diferentes: {existing}\n"
                    f"Voce pediu: {want}. Use outro arquivo --db.")
            return
        self.conn.executemany("INSERT INTO meta VALUES (?,?)", want.items())
        self.conn.commit()

    # -- progresso do scan ------------------------------------------------- #

    def done_chunk_ids(self) -> set[int]:
        return {r[0] for r in self.conn.execute("SELECT idx FROM done_chunks")}

    def mark_done(self, idx: int, free_names: Sequence[str]) -> None:
        self.conn.execute("INSERT OR IGNORE INTO done_chunks VALUES (?)", (idx,))
        if free_names:
            self.conn.executemany(
                "INSERT OR IGNORE INTO candidates (name, origin, len) VALUES (?,'scan',?)",
                ((n, len(n)) for n in free_names))

    def commit(self) -> None:
        self.conn.commit()

    # -- amostragem -------------------------------------------------------- #

    def add_sampled(self, pairs: Iterable[tuple[str, str]]) -> int:
        cur = self.conn.executemany(
            "INSERT OR IGNORE INTO sampled (name, origin, len) VALUES (?,?,?)",
            ((n, o, len(n)) for n, o in pairs))
        self.conn.commit()
        return cur.rowcount

    def known_sampled(self) -> set[str]:
        return {r[0] for r in self.conn.execute("SELECT name FROM sampled")}

    def sampled_pending(self) -> list[str]:
        return [r[0] for r in self.conn.execute(
            "SELECT name FROM sampled WHERE checked=0 ORDER BY len, name")]

    def sampled_total(self) -> int:
        return self.conn.execute("SELECT COUNT(*) FROM sampled").fetchone()[0]

    def mark_sampled_checked(self, names: Sequence[str], free: Sequence[str]) -> None:
        self.conn.executemany(
            "UPDATE sampled SET checked=1 WHERE name=?", ((n,) for n in names))
        if free:
            marks = ",".join("?" * len(free))
            self.conn.execute(
                f"INSERT OR IGNORE INTO candidates (name, origin, len) "
                f"SELECT name, origin, len FROM sampled WHERE name IN ({marks})",
                tuple(free))

    # -- consulta ---------------------------------------------------------- #

    def candidate_count(self) -> int:
        return self.conn.execute("SELECT COUNT(*) FROM candidates").fetchone()[0]

    def unverified(self, origin: str | None = None,
                   lengths: Sequence[int] | None = None) -> list[str]:
        """origin aceita lista separada por virgula:
        'words,markov,leet:gold' ou 'todos'."""
        sql = "SELECT name FROM candidates WHERE verified IS NULL"
        params: list = []

        if origin and origin.strip().lower() not in ("todos", "all", ""):
            clauses = []
            for tok in (t.strip() for t in origin.split(",") if t.strip()):
                if tok == "words":
                    clauses.append("origin LIKE 'word:%'")
                elif tok == "leet":
                    clauses.append("origin LIKE 'leet:%'")
                elif tok in ("pattern", "padrao"):
                    clauses.append("origin LIKE 'pattern:%'")
                elif tok in ("markov", "random", "scan"):
                    clauses.append("origin = ?")
                    params.append(tok)
                else:
                    clauses.append("origin = ?")
                    params.append(tok if ":" in tok else f"leet:{tok}")
            if clauses:
                sql += " AND (" + " OR ".join(clauses) + ")"

        if lengths:
            sql += " AND len IN (" + ",".join("?" * len(lengths)) + ")"
            params.extend(lengths)

        sql += f" ORDER BY {PRIORITY_SQL}, len, name"
        return [r[0] for r in self.conn.execute(sql, tuple(params))]

    def stats(self) -> list[tuple]:
        return list(self.conn.execute(
            "SELECT CASE WHEN origin LIKE 'word:%'    THEN 'palavra real' "
            "            WHEN origin = 'markov'       THEN 'markov' "
            "            WHEN origin LIKE 'pattern:%' THEN 'padrao fonetico' "
            "            WHEN origin LIKE 'leet:%'    THEN 'leetspeak' "
            "            WHEN origin = 'scan'         THEN 'varredura' "
            "            ELSE 'aleatorio' END AS grupo, "
            "       len, COUNT(*), "
            "       SUM(verified IS NULL), "
            "       SUM(verified='AVAILABLE') "
            "FROM candidates GROUP BY grupo, len ORDER BY grupo, len"))

    def set_verified(self, name: str, status: str) -> None:
        self.conn.execute("UPDATE candidates SET verified=? WHERE name=?", (status, name))

    def export_detailed(self, only_available: bool) -> list[tuple[str, str, str]]:
        sql = ("SELECT name, COALESCE(origin,'?'), COALESCE(verified,'NAO VERIFICADO') "
               "FROM candidates")
        if only_available:
            sql += " WHERE verified='AVAILABLE'"
        sql += " ORDER BY LENGTH(name), origin, name"
        return list(self.conn.execute(sql))

    def close(self) -> None:
        self.conn.commit()
        self.conn.close()


# --------------------------------------------------------------------------- #
# Geracao exaustiva (comando scan)
# --------------------------------------------------------------------------- #

def iter_names(alphabet: str, length: int) -> Iterator[str]:
    """Gera todos os nomes em ordem lexicografica sem materializar a lista."""
    base = len(alphabet)
    for n in range(base ** length):
        chars = []
        x = n
        for _ in range(length):
            x, r = divmod(x, base)
            chars.append(alphabet[r])
        yield "".join(reversed(chars))


def chunk_offsets(alphabet: str, lengths: Sequence[int]) -> dict[int, int]:
    """Indice global do primeiro lote de cada comprimento, para o resume
    continuar valido quando a varredura cobre varios comprimentos."""
    offsets, acc = {}, 0
    for L in lengths:
        offsets[L] = acc
        acc += math.ceil(len(alphabet) ** L / BULK_MAX)
    return offsets


def total_chunks(alphabet: str, lengths: Sequence[int]) -> int:
    return sum(math.ceil(len(alphabet) ** L / BULK_MAX) for L in lengths)


def iter_chunks(alphabet: str, lengths: Sequence[int],
                keep: Callable[[str], bool] | None = None,
                size: int = BULK_MAX) -> Iterator[tuple[int, list[str]]]:
    """Produz (indice_global_do_lote, [nomes]).

    `keep` descarta nomes antes de eles gastarem requisicao (palavrao,
    formato). O indice do lote continua sendo derivado da posicao absoluta,
    entao o resume nao quebra se o filtro mudar entre execucoes."""
    offsets = chunk_offsets(alphabet, lengths)
    for L in lengths:
        base_idx = offsets[L]
        buf: list[str] = []
        local = 0
        for i, name in enumerate(iter_names(alphabet, L)):
            if i and i % size == 0:
                if buf:
                    yield base_idx + local, buf
                    buf = []
                local += 1
            if keep is None or keep(name):
                buf.append(name)
        if buf:
            yield base_idx + local, buf


# --------------------------------------------------------------------------- #
# Dicionarios
# --------------------------------------------------------------------------- #

def strip_accents(raw: str) -> str:
    w = unicodedata.normalize("NFKD", raw)
    return "".join(c for c in w if not unicodedata.combining(c))


def normalize_word(raw: str, lengths: Sequence[int]) -> str | None:
    """'ACAO' / 'acao' com cedilha -> 'acao'. None se nao virar nick valido
    de um dos comprimentos pedidos."""
    w = strip_accents(raw.strip().lower())
    if len(w) not in lengths:
        return None
    if not all(c in NAME_CHARS for c in w):
        return None
    return w


def load_wordlist(langs: Sequence[str], lengths: Sequence[int], cache_dir: str,
                  extra_file: str | None = None) -> list[str]:
    """Palavras reais dos idiomas pedidos, nos comprimentos pedidos."""
    words: set[str] = set()
    lset = set(lengths)

    for lang in langs:
        url = WORDLIST_URLS.get(lang)
        if not url:
            raise SystemExit(f"Idioma desconhecido: {lang}. Opcoes: {list(WORDLIST_URLS)}")
        raw = _cached_download(url, cache_dir, f"words_{lang}.txt",
                               label=f"dicionario '{lang}'")
        antes = len(words)
        for token in raw.split():
            w = normalize_word(token, lset)
            if w:
                words.add(w)
        print(f"  {lang}: +{len(words) - antes:,} palavras")

    if extra_file:
        antes = len(words)
        for token in open(extra_file, encoding="utf-8").read().split():
            w = normalize_word(token, lset)
            if w:
                words.add(w)
        print(f"  {extra_file}: +{len(words) - antes:,} palavras")

    return sorted(words)


def load_wordlist_raw(langs: Sequence[str], cache_dir: str,
                      extra_file: str | None = None) -> list[str]:
    """Todas as palavras de 3..12 letras — corpus de treino do markov.
    Independe do comprimento alvo: o modelo aprende a fonetica do idioma."""
    words: set[str] = set()
    for lang in langs:
        url = WORDLIST_URLS.get(lang)
        if not url:
            continue
        raw = _cached_download(url, cache_dir, f"words_{lang}.txt",
                               label=f"dicionario '{lang}'", quiet=True)
        for token in raw.split():
            w = strip_accents(token.strip().lower())
            if 3 <= len(w) <= 12 and w.isalpha() and w.isascii():
                words.add(w)
    if extra_file:
        for token in open(extra_file, encoding="utf-8").read().split():
            w = strip_accents(token.strip().lower())
            if 3 <= len(w) <= 12 and w.isalpha() and w.isascii():
                words.add(w)
    return sorted(words)


# --------------------------------------------------------------------------- #
# Modelo de caracteres (markov) — nomes que "parecem palavra"
# --------------------------------------------------------------------------- #

END = "$"


class MarkovNames:
    """Ordem 2 por padrao: aprende quais trigramas existem em en/pt e gera
    nomes novos com a mesma sonoridade. 'kova', 'brine', 'salta', 'nerix'…

    E isto que resolve o seu problema dos 31 resultados: existem poucas
    palavras reais de 4 letras livres, mas ha dezenas de milhares de
    combinacoes que *soam* como palavra e ninguem registrou."""

    def __init__(self, words: Sequence[str], order: int = 2):
        self.order = order
        self.model: dict[str, dict[str, int]] = collections.defaultdict(
            lambda: collections.defaultdict(int))
        pad = "^" * order
        for w in words:
            seq = pad + w + END
            for i in range(order, len(seq)):
                self.model[seq[i - order:i]][seq[i]] += 1
        self.model = {k: dict(v) for k, v in self.model.items()}
        self.trained_on = len(words)

    def _pick(self, dist: dict[str, int], rng: random.Random,
              exclude: str | None = None) -> str | None:
        items = [(c, w) for c, w in dist.items() if c != exclude]
        if not items:
            return None
        total = sum(w for _, w in items)
        r = rng.random() * total
        upto = 0.0
        for c, w in items:
            upto += w
            if upto >= r:
                return c
        return items[-1][0]

    def generate(self, length: int, rng: random.Random,
                 tries: int = 400) -> str | None:
        pad = "^" * self.order
        for _ in range(tries):
            state, out = pad, []
            ok = True
            for _ in range(length):
                dist = self.model.get(state)
                if not dist:
                    ok = False
                    break
                ch = self._pick(dist, rng, exclude=END)
                if ch is None:
                    ok = False
                    break
                out.append(ch)
                state = (state + ch)[-self.order:]
            if ok and END in self.model.get(state, {}):
                return "".join(out)
        return None

    def score(self, name: str) -> float:
        """log-probabilidade media por caractere. Quanto maior, mais
        parecido com palavra de verdade."""
        state = "^" * self.order
        total, n = 0.0, 0
        for ch in name + END:
            dist = self.model.get(state, {})
            s = sum(dist.values())
            p = dist.get(ch, 0)
            total += math.log((p + 0.1) / (s + 0.1 * 30))
            n += 1
            state = (state + ch)[-self.order:]
        return total / max(n, 1)

    def sample(self, n: int, lengths: Sequence[int], rng: random.Random,
               keep: Callable[[str], bool] | None = None) -> list[str]:
        out: set[str] = set()
        stall = 0
        per = max(1, n // len(lengths))
        for L in lengths:
            alvo = min(n - len(out), per) if L != lengths[-1] else n - len(out)
            local = 0
            stall = 0
            while local < alvo and stall < alvo * 60 + 2000:
                cand = self.generate(L, rng)
                stall += 1
                if not cand or cand in out:
                    continue
                if keep and not keep(cand):
                    continue
                out.add(cand)
                local += 1
        return sorted(out)


# --------------------------------------------------------------------------- #
# Leetspeak: cool -> c00l, co0l, c0ol ...
# --------------------------------------------------------------------------- #

LEET_MAP = {
    "o": "0", "i": "1", "l": "1", "e": "3", "a": "4",
    "s": "5", "t": "7", "b": "8", "g": "9", "z": "2",
}


def leet_variants(word: str, max_per_word: int = 0,
                  rng: random.Random | None = None) -> list[str]:
    """Todas as combinacoes de substituicao leet de `word`, exceto a original."""
    positions = [i for i, ch in enumerate(word) if ch in LEET_MAP]
    if not positions:
        return []
    if len(positions) > 12:            # nome longo: evita explosao 2^n
        positions = positions[:12]

    out: list[str] = []
    for mask in range(1, 2 ** len(positions)):
        chars = list(word)
        for bit, pos in enumerate(positions):
            if mask >> bit & 1:
                chars[pos] = LEET_MAP[word[pos]]
        out.append("".join(chars))

    if max_per_word and len(out) > max_per_word:
        (rng or random.Random(0)).shuffle(out)
        out = sorted(out[:max_per_word])
    return out


def build_leet(words: Sequence[str], max_per_word: int,
               seed: int | None,
               keep: Callable[[str], bool] | None = None) -> list[tuple[str, str]]:
    """[(variante, 'leet:palavra'), ...] sem repeticoes."""
    rng = random.Random(seed)
    seen: set[str] = set(words)
    out: list[tuple[str, str]] = []
    for w in words:
        for v in leet_variants(w, max_per_word, rng):
            if v in seen:
                continue
            seen.add(v)
            if keep and not keep(v):
                continue
            out.append((v, f"leet:{w}"))
    return out


# --------------------------------------------------------------------------- #
# Amostragem aleatoria
# --------------------------------------------------------------------------- #

def draw_random_names(alphabet: str, lengths: Sequence[int], n: int,
                      seed: int | None, exclude: set[str],
                      keep: Callable[[str], bool] | None = None) -> list[str]:
    rng = random.Random(seed)
    out: set[str] = set()
    space = sum(len(alphabet) ** L for L in lengths)
    if n > space - len(exclude):
        raise SystemExit(f"Impossivel sortear {n} nomes novos: espaco total e {space:,}.")
    tries = 0
    while len(out) < n:
        L = rng.choice(list(lengths))
        cand = "".join(rng.choice(alphabet) for _ in range(L))
        tries += 1
        if cand not in exclude and cand not in out and (keep is None or keep(cand)):
            out.add(cand)
        if tries > n * 500 + 10000:
            print(f"  aviso: parei em {len(out):,} de {n:,} sorteios "
                  f"(filtros muito restritivos)")
            break
    return sorted(out)


# --------------------------------------------------------------------------- #
# Filtro composto usado por quick / scan / verify
# --------------------------------------------------------------------------- #

def make_filter(clean: bool = False, pronounceable: bool = False,
                pattern: str | None = None,
                badwords: BadWords | None = None,
                lengths: Sequence[int] | None = None,
                markov: MarkovNames | None = None,
                min_score: float | None = None) -> Callable[[str], bool]:
    lset = set(lengths) if lengths else None

    def ok(name: str) -> bool:
        if lset is not None and len(name) not in lset:
            return False
        if clean and not name.isalpha():
            return False
        if pronounceable and not is_pronounceable(name):
            return False
        if pattern and not match_pattern(name, pattern):
            return False
        if badwords is not None and badwords.hit(name):
            return False
        if markov is not None and min_score is not None and markov.score(name) < min_score:
            return False
        return True

    return ok


# --------------------------------------------------------------------------- #
# Etapa 1: lookup em lote
# --------------------------------------------------------------------------- #

class Scanner:
    def __init__(self, session, url: str, limiter: RateLimiter, max_retries: int = 6):
        self.session = session
        self.url = url
        self.limiter = limiter
        self.max_retries = max_retries
        self.requests_made = 0
        self.rejected: list[str] = []

    async def lookup(self, names: Sequence[str]) -> list[str] | None:
        """Nomes do lote que NAO tem conta. None = desistiu apos as tentativas."""
        names = [n for n in names if valid_name(n)]
        if not names:
            return []
        backoff = 30.0

        for _ in range(self.max_retries):
            await self.limiter.acquire()
            try:
                async with self.session.post(self.url, json=list(names)) as resp:
                    self.requests_made += 1

                    if resp.status == 200:
                        taken = {p["name"].lower() for p in await resp.json()}
                        return [n for n in names if n.lower() not in taken]

                    if resp.status == 429:
                        retry_after = resp.headers.get("Retry-After")
                        wait = float(retry_after) if (retry_after or "").isdigit() else backoff
                        print(f"  [429] limite atingido, pausando {wait:.0f}s", flush=True)
                        await self.limiter.pause(wait)
                        backoff = min(backoff * 2, 600)
                        continue

                    if resp.status == 400:
                        # um nome do lote foi rejeitado; divide para isolar
                        # em vez de perder os outros nove.
                        if len(names) == 1:
                            self.rejected.append(names[0])
                            return []
                        mid = len(names) // 2
                        a = await self.lookup(names[:mid])
                        b = await self.lookup(names[mid:])
                        if a is None or b is None:
                            return None
                        return a + b

                    if resp.status in (500, 502, 503, 504, 403):
                        await asyncio.sleep(backoff)
                        backoff = min(backoff * 2, 300)
                        continue

                    body = (await resp.text())[:300]
                    print(f"  [HTTP {resp.status}] {body}", flush=True)
                    return None

            except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
                print(f"  [rede] {type(exc).__name__}: {exc} — retry em {backoff:.0f}s",
                      flush=True)
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 300)

        return None


async def bulk_filter(store: Store, names: Sequence[str], args) -> int:
    """Passa `names` pelo lookup em lote e grava os que nao tem conta."""
    limiter = RateLimiter(args.rate, args.window)
    timeout = aiohttp.ClientTimeout(total=30)
    headers = {"User-Agent": args.user_agent, "Accept": "application/json"}
    found = 0
    chunks = [list(names[i:i + BULK_MAX]) for i in range(0, len(names), BULK_MAX)]

    async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
        scanner = Scanner(session, BULK_ENDPOINTS[args.endpoint], limiter)
        for i, chunk in enumerate(chunks, 1):
            free = await scanner.lookup(chunk)
            if free is None:
                print(f"  lote {i}/{len(chunks)}: falhou, sera retentado depois")
                continue
            store.mark_sampled_checked(chunk, free)
            found += len(free)
            if i % 10 == 0 or i == len(chunks):
                store.commit()
                print(f"  lote {i}/{len(chunks)} — candidatos ate agora: {found:,}",
                      flush=True)
    store.commit()
    if scanner.rejected:
        print(f"  {len(scanner.rejected)} nomes recusados pela API "
              f"(ex: {', '.join(scanner.rejected[:5])})")
    return found


# --------------------------------------------------------------------------- #
# Montagem da amostra (usada por quick e preview)
# --------------------------------------------------------------------------- #

def build_sample(args, lengths: Sequence[int], alphabet: str,
                 exclude: set[str], quiet: bool = False) -> list[tuple[str, str]]:
    """Devolve [(nome, origem), ...] a partir de todas as fontes ligadas."""
    rng = random.Random(args.seed)
    badwords = BadWords.load(getattr(args, "badwords", None), args.cache_dir,
                             getattr(args, "badword_mode", "smart"),
                             getattr(args, "badword_file", None),
                             getattr(args, "allow_file", None), quiet=quiet)

    keep = make_filter(clean=getattr(args, "clean", False),
                       pronounceable=getattr(args, "pronounceable", False),
                       badwords=badwords, lengths=lengths)

    langs = [s.strip() for s in (args.words or "").split(",") if s.strip()]
    novos: list[tuple[str, str]] = []
    palavras: list[str] = []
    bloqueados = 0

    # --- 1. palavras reais ------------------------------------------------ #
    if langs or args.wordfile:
        print("carregando palavras reais:")
        palavras = load_wordlist(langs, lengths, args.cache_dir, args.wordfile)
        if args.max_words:
            random.Random(args.seed).shuffle(palavras)
            palavras = sorted(palavras[: args.max_words])
        limpas = [w for w in palavras if keep(w)]
        bloqueados += len(palavras) - len(limpas)
        origem = f"word:{args.words or 'file'}"
        add = [(w, origem) for w in limpas if w not in exclude]
        novos += add
        print(f"  -> {len(add):,} palavras entram na amostra "
              f"({len(palavras) - len(limpas):,} descartadas pelo filtro)")

    # --- 2. leetspeak ----------------------------------------------------- #
    if args.leet:
        if not palavras:
            raise SystemExit("--leet precisa de --words e/ou --wordfile.")
        variantes = build_leet(palavras, args.leet_max, args.seed, keep=keep)
        variantes = [(v, o) for v, o in variantes if v not in exclude]
        novos += variantes
        if variantes:
            print(f"  -> {len(variantes):,} variantes leetspeak "
                  f"(ex: {', '.join(v for v, _ in variantes[:5])})")

    # --- 3. padrao fonetico ----------------------------------------------- #
    for pat in (p.strip().lower() for p in (args.pattern or "").split(",") if p.strip()):
        alvo_lens = {len(pat)}
        if not alvo_lens <= set(lengths):
            print(f"  aviso: padrao '{pat}' tem {len(pat)} caracteres, "
                  f"fora de --length {fmt_lengths(list(lengths))}")
        space = pattern_space(pat)
        if args.pattern_max and space > args.pattern_max:
            gerados = sample_pattern(pat, args.pattern_max, rng)
        else:
            gerados = list(iter_pattern(pat))
        limpos = [g for g in gerados if g not in exclude and keep(g)]
        novos += [(g, f"pattern:{pat}") for g in limpos]
        print(f"  -> padrao {pat.upper()}: espaco {space:,}, "
              f"{len(limpos):,} entram (ex: {', '.join(limpos[:5])})")

    # --- 4. markov -------------------------------------------------------- #
    if args.markov:
        corpus_langs = langs or ["en", "pt"]
        corpus = load_wordlist_raw(corpus_langs, args.cache_dir, args.wordfile)
        if len(corpus) < 500:
            raise SystemExit("Corpus pequeno demais para treinar o markov. "
                             "Use --words en,pt.")
        model = MarkovNames(corpus, order=args.markov_order)
        print(f"  markov treinado em {model.trained_on:,} palavras "
              f"({','.join(corpus_langs)}, ordem {args.markov_order})")
        mkeep = make_filter(clean=True, pronounceable=True,
                            badwords=badwords, lengths=lengths)
        gerados = model.sample(args.markov, list(lengths), rng,
                               keep=lambda n: n not in exclude and mkeep(n))
        novos += [(g, "markov") for g in gerados]
        print(f"  -> {len(gerados):,} nomes markov "
              f"(ex: {', '.join(gerados[:8])})")

    # --- 5. aleatorio puro ------------------------------------------------ #
    if args.n:
        excl = exclude | {n for n, _ in novos}
        sorteados = draw_random_names(alphabet, lengths, args.n, args.seed,
                                      excl, keep=keep)
        novos += [(s, "random") for s in sorteados]
        print(f"  -> {len(sorteados):,} nomes aleatorios")

    # dedup preservando a primeira origem (mais valiosa)
    visto: set[str] = set()
    final: list[tuple[str, str]] = []
    for name, origin in novos:
        if name in visto:
            continue
        visto.add(name)
        final.append((name, origin))
    return final


# --------------------------------------------------------------------------- #
# Comando: quick
# --------------------------------------------------------------------------- #

async def run_quick(args) -> None:
    """monta amostra -> filtra em lote -> verifica com token -> exporta."""
    lengths = parse_lengths(args.length)
    alphabet = ALPHABETS.get(args.alphabet, args.alphabet)
    store = Store(args.db)

    print(f"comprimentos: {fmt_lengths(lengths)}")
    pending = store.sampled_pending()

    if not pending:
        already = store.known_sampled()
        novos = build_sample(args, lengths, alphabet, already)
        if not novos:
            raise SystemExit(
                "Nada a fazer. Ligue pelo menos uma fonte: --words, --pattern, "
                "--markov ou --n.")
        store.add_sampled(novos)
        print(f"\ntotal na amostra: {store.sampled_total():,}")
        pending = store.sampled_pending()

    if pending:
        reqs = math.ceil(len(pending) / BULK_MAX)
        print(f"\n[1/2] lookup em lote de {len(pending):,} nomes "
              f"({reqs:,} requisicoes, ~{fmt_eta(reqs * args.window / args.rate)})")
        await bulk_filter(store, pending, args)
    else:
        print("[1/2] lookup em lote ja concluido nesta amostra.")

    total = store.candidate_count()
    restantes = len(store.unverified())
    print(f"\ncandidatos (sem conta associada): {total:,}")

    if not args.token:
        print("\nSem --token nao da para separar liberado de bloqueado/cooldown.")
        print(f"Rode depois: python mcnames.py verify --db {args.db} "
              f"--token \"<seu token>\"")
        store.close()
        return

    print(f"[2/2] verificando {restantes:,} candidatos "
          f"(~{fmt_eta(restantes * args.window_verify / args.rate_verify)})\n")
    store.close()

    vargs = argparse.Namespace(
        db=args.db, token=args.token, limit=args.verify_limit,
        rate=args.rate_verify, window=args.window_verify,
        user_agent=args.user_agent, origin=getattr(args, "origin", None),
        length=None, clean=args.clean, pronounceable=args.pronounceable,
        pattern=None, badwords=args.badwords, badword_mode=args.badword_mode,
        badword_file=getattr(args, "badword_file", None),
        allow_file=getattr(args, "allow_file", None),
        cache_dir=args.cache_dir, min_score=getattr(args, "min_score", None),
        sort="score", words=args.words or "en,pt",
    )
    await run_verify(vargs)

    store = Store(args.db)
    write_report(store, args.out, only_available=True)
    store.close()


# --------------------------------------------------------------------------- #
# Comando: scan (varredura exaustiva)
# --------------------------------------------------------------------------- #

async def run_scan(args) -> None:
    lengths = parse_lengths(args.length)
    alphabet = ALPHABETS.get(args.alphabet, args.alphabet)
    total_names = sum(len(alphabet) ** L for L in lengths)
    tchunks = total_chunks(alphabet, lengths)

    store = Store(args.db)
    store.bind_run(args.alphabet, lengths)
    done = store.done_chunk_ids()

    badwords = BadWords.load(args.badwords, args.cache_dir, args.badword_mode,
                             getattr(args, "badword_file", None),
                             getattr(args, "allow_file", None))
    keep = make_filter(clean=args.clean, pronounceable=args.pronounceable,
                       pattern=args.pattern, badwords=badwords)

    print(f"alfabeto : {alphabet!r} ({len(alphabet)} simbolos)")
    print(f"tamanhos : {fmt_lengths(lengths)}")
    print(f"nomes    : {total_names:,}")
    print(f"lotes    : {tchunks:,}  (ja concluidos: {len(done):,})")
    print(f"limite   : {args.rate} req / {args.window}s")
    print(f"ETA      : {fmt_eta((tchunks - len(done)) * args.window / args.rate)}")
    if total_names > 20_000_000:
        print("\nAVISO: esse espaco e grande demais para varredura exaustiva.")
        print("Use 'quick' com --pattern/--markov em vez de 'scan'.")
    print()

    limiter = RateLimiter(args.rate, args.window)
    queue: asyncio.Queue = asyncio.Queue(maxsize=args.concurrency * 4)
    stop = asyncio.Event()

    def _handle_sigint():
        if not stop.is_set():
            print("\nEncerrando com seguranca (progresso salvo)... "
                  "Ctrl+C de novo forca.", flush=True)
            stop.set()

    try:
        asyncio.get_running_loop().add_signal_handler(signal.SIGINT, _handle_sigint)
    except NotImplementedError:  # Windows
        pass

    stats = {"processed": 0, "found": 0, "failed": 0, "start": time.monotonic()}
    timeout = aiohttp.ClientTimeout(total=30)
    headers = {"User-Agent": args.user_agent, "Accept": "application/json"}

    async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
        scanner = Scanner(session, BULK_ENDPOINTS[args.endpoint], limiter)

        async def producer():
            for idx, names in iter_chunks(alphabet, lengths, keep=keep):
                if stop.is_set():
                    break
                if idx in done:
                    continue
                await queue.put((idx, names))
            for _ in range(args.concurrency):
                await queue.put(None)

        async def worker():
            while True:
                item = await queue.get()
                if item is None:
                    queue.task_done()
                    return
                idx, names = item
                free = await scanner.lookup(names)
                if free is None:
                    stats["failed"] += 1
                else:
                    store.mark_done(idx, free)
                    stats["found"] += len(free)
                stats["processed"] += 1
                if stats["processed"] % 50 == 0:
                    store.commit()
                    report(stats, tchunks, len(done), limiter)
                queue.task_done()

        await asyncio.gather(producer(), *[worker() for _ in range(args.concurrency)])

    store.commit()
    report(stats, tchunks, len(done), limiter, final=True)
    print(f"\ncandidatos no banco: {store.candidate_count():,}")
    print("Lembre-se: candidato != liberado. Rode 'verify' para confirmar.")
    store.close()


def report(stats, tchunks, already_done, limiter, final=False):
    elapsed = time.monotonic() - stats["start"]
    rate = stats["processed"] / elapsed if elapsed else 0
    remaining = tchunks - already_done - stats["processed"]
    eta = remaining / rate if rate else 0
    tag = "FIM " if final else ""
    print(
        f"{tag}lotes {stats['processed']:,}/{tchunks - already_done:,}  "
        f"candidatos {stats['found']:,}  falhas {stats['failed']}  "
        f"429s {limiter.throttle_events}  "
        f"{rate * BULK_MAX:.0f} nomes/s  ETA {fmt_eta(eta)}",
        flush=True,
    )


def fmt_eta(seconds: float) -> str:
    if seconds <= 0:
        return "-"
    d, rem = divmod(int(seconds), 86400)
    h, rem = divmod(rem, 3600)
    m, _ = divmod(rem, 60)
    if d:
        return f"{d}d {h}h"
    if h:
        return f"{h}h {m}min"
    return f"{m}min"


# --------------------------------------------------------------------------- #
# Etapa 2: verificacao autenticada
# --------------------------------------------------------------------------- #

async def run_verify(args) -> None:
    store = Store(args.db)
    lengths = parse_lengths(args.length) if getattr(args, "length", None) else None
    pending = store.unverified(getattr(args, "origin", None), lengths)

    badwords = BadWords.load(getattr(args, "badwords", None),
                             getattr(args, "cache_dir", ".cache"),
                             getattr(args, "badword_mode", "smart"),
                             getattr(args, "badword_file", None),
                             getattr(args, "allow_file", None), quiet=True)
    keep = make_filter(clean=getattr(args, "clean", False),
                       pronounceable=getattr(args, "pronounceable", False),
                       pattern=getattr(args, "pattern", None),
                       badwords=badwords)

    antes = len(pending)
    pending = [n for n in pending if keep(n)]
    if antes != len(pending):
        print(f"filtros descartaram {antes - len(pending):,} nomes "
              f"antes de gastar requisicao")

    # Ordenacao por qualidade: o modelo markov sabe que 'ilej' parece mais
    # com palavra do que 'qyoj'. Sem isso a fila entrega os nicks feios
    # primeiro, e cada um custa 17s.
    min_score = getattr(args, "min_score", None)
    if getattr(args, "sort", "score") == "score" or min_score is not None:
        model = load_scorer(getattr(args, "words", None) or "en,pt",
                            getattr(args, "cache_dir", ".wordcache"))
        if model:
            scored = sorted(((model.score(n), n) for n in pending), reverse=True)
            if min_score is not None:
                cortados = [n for s, n in scored if s < min_score]
                scored = [(s, n) for s, n in scored if s >= min_score]
                if cortados:
                    print(f"score < {min_score}: {len(cortados):,} descartados "
                          f"(ex: {', '.join(cortados[:8])})")
            pending = [n for _, n in scored]
            if scored:
                print(f"ordenado por qualidade — melhor: {scored[0][1]} "
                      f"({scored[0][0]:.2f}), pior: {scored[-1][1]} "
                      f"({scored[-1][0]:.2f})")

    if not pending:
        print("Nada para verificar com esses filtros.")
        store.close()
        return

    if args.limit:
        pending = pending[: args.limit]

    print(f"a verificar : {len(pending):,} nomes")
    print(f"limite      : 20 req / 5 min POR CONTA (endpoint autenticado)")
    print(f"ETA         : {fmt_eta(len(pending) * 300 / 20)}")
    print("Uma requisicao a cada ~16s. Nao rode duas instancias com o mesmo token.\n")

    limiter = RateLimiter(args.rate, args.window)
    headers = {
        "Authorization": f"Bearer {args.token}",
        "User-Agent": args.user_agent,
        "Accept": "application/json",
    }
    timeout = aiohttp.ClientTimeout(total=30)
    counts: dict[str, int] = collections.Counter()

    async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
        for i, name in enumerate(pending, 1):
            await limiter.acquire()
            url = AVAILABLE_ENDPOINT.format(name=name)
            try:
                async with session.get(url) as resp:
                    if resp.status == 429:
                        print("  [429] pausando 5 min", flush=True)
                        await limiter.pause(300)
                        continue
                    if resp.status == 401:
                        print("Token invalido ou expirado. Gere um novo access token.")
                        break
                    if resp.status == 403:
                        print("403 — conta possivelmente suspensa. Pare e aguarde ~24h.")
                        break
                    if resp.status != 200:
                        print(f"  {name}: HTTP {resp.status}", flush=True)
                        continue
                    status = (await resp.json()).get("status", "?")
            except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
                print(f"  {name}: erro de rede ({exc})", flush=True)
                continue

            store.set_verified(name, status)
            counts[status] += 1
            marker = ">>>" if status == "AVAILABLE" else "   "
            print(f"{marker} [{i}/{len(pending)}] {name}: {status}", flush=True)
            if i % 10 == 0:
                store.commit()

    store.commit()
    print("\nresumo:", dict(counts))
    if counts.get("NOT_ALLOWED", 0) > counts.get("AVAILABLE", 0) * 3:
        print("Muitos NOT_ALLOWED: considere --badwords en,pt ou --pronounceable "
              "para nao gastar o limite da conta com nomes filtrados.")
    store.close()


# --------------------------------------------------------------------------- #
# Relatorio
# --------------------------------------------------------------------------- #

def write_report(store: Store, path: str, only_available: bool) -> None:
    rows = store.export_detailed(only_available)
    if not rows:
        print("\nNenhum nome disponivel encontrado nesta amostra.")
        open(path, "w", encoding="utf-8").close()
        return

    grupos: dict[str, list[str]] = collections.defaultdict(list)
    for name, origin, _ in rows:
        if origin.startswith("leet:"):
            grupos[f"leetspeak (de '{origin[5:]}')"].append(name)
        elif origin.startswith("word:"):
            grupos["palavra real"].append(name)
        elif origin.startswith("pattern:"):
            grupos[f"padrao {origin[8:].upper()}"].append(name)
        elif origin == "markov":
            grupos["markov (parece palavra)"].append(name)
        elif origin == "random":
            grupos["aleatorio (sem significado)"].append(name)
        elif origin == "scan":
            grupos["varredura exaustiva"].append(name)
        else:
            grupos[origin].append(name)

    linhas = [f"# {len(rows)} nicks DISPONIVEIS", ""]
    for chave in sorted(grupos):
        nomes = sorted(grupos[chave], key=lambda n: (len(n), n))
        linhas.append(f"## {chave}  ({len(nomes)})")
        linhas += nomes
        linhas.append("")

    with open(path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(linhas) + "\n")

    print(f"\n{len(rows):,} nomes DISPONIVEIS gravados em {path}\n")
    for chave in sorted(grupos):
        amostra = "  ".join(sorted(grupos[chave])[:12])
        print(f"  {chave} ({len(grupos[chave])}): {amostra}")


# --------------------------------------------------------------------------- #
# Utilitarios
# --------------------------------------------------------------------------- #

def run_preview(args) -> None:
    """Mostra o que seria gerado, sem tocar na API. Use antes de rodar quick."""
    lengths = parse_lengths(args.length)
    alphabet = ALPHABETS.get(args.alphabet, args.alphabet)
    novos = build_sample(args, lengths, alphabet, exclude=set())
    if not novos:
        raise SystemExit("Nenhuma fonte ligada. Use --words, --pattern, --markov ou --n.")

    por_origem: dict[str, list[str]] = collections.defaultdict(list)
    for name, origin in novos:
        chave = origin.split(":")[0]
        por_origem[chave].append(name)

    print(f"\ntotal gerado: {len(novos):,} nomes")
    print(f"requisicoes de lookup: {math.ceil(len(novos)/BULK_MAX):,} "
          f"(~{fmt_eta(math.ceil(len(novos)/BULK_MAX)*args.window/args.rate)})")
    print(f"tempo de verify se TODOS virarem candidato: "
          f"{fmt_eta(len(novos)*17)}  <- por isso os filtros importam\n")
    for chave in sorted(por_origem):
        amostra = "  ".join(por_origem[chave][:20])
        print(f"  {chave} ({len(por_origem[chave]):,}): {amostra}")


def run_estimate(args) -> None:
    lengths = parse_lengths(args.length)
    alphabet = ALPHABETS.get(args.alphabet, args.alphabet)
    print(f"alfabeto   : {alphabet!r} ({len(alphabet)} simbolos)")
    total = 0
    for L in lengths:
        n = len(alphabet) ** L
        total += n
        print(f"  {L} chars : {n:,}")
    chunks = math.ceil(total / BULK_MAX)
    seconds = chunks * args.window / args.rate
    print(f"combinacoes: {total:,}")
    print(f"requisicoes: {chunks:,} (lotes de {BULK_MAX})")
    print(f"a {args.rate} req/{args.window}s -> {fmt_eta(seconds)} de execucao continua")
    if args.pattern:
        for pat in args.pattern.split(","):
            pat = pat.strip()
            if pat:
                print(f"padrao {pat.upper()}: {pattern_space(pat):,} combinacoes "
                      f"({math.ceil(pattern_space(pat)/BULK_MAX):,} requisicoes)")


def run_stats(args) -> None:
    store = Store(args.db)
    rows = store.stats()
    if not rows:
        print("Banco vazio.")
        store.close()
        return
    print(f"{'origem':<20}{'len':>5}{'candidatos':>12}{'a verificar':>14}"
          f"{'DISPONIVEIS':>14}{'tempo':>10}")
    print("-" * 75)
    tot = [0, 0, 0]
    for grupo, ln, total, pend, disp in rows:
        pend, disp = pend or 0, disp or 0
        horas = pend * 17 / 3600
        print(f"{grupo:<20}{ln or 0:>5}{total:>12,}{pend:>14,}{disp:>14,}{horas:>9.1f}h")
        tot = [tot[0] + total, tot[1] + pend, tot[2] + disp]
    print("-" * 75)
    print(f"{'TOTAL':<20}{'':>5}{tot[0]:>12,}{tot[1]:>14,}{tot[2]:>14,}"
          f"{tot[1]*17/3600:>9.1f}h")
    store.close()


_SCORER_CACHE: dict[str, "MarkovNames | None"] = {}


def load_scorer(langs: str, cache_dir: str) -> "MarkovNames | None":
    """Modelo usado so para PONTUAR nomes ja existentes. Cacheado porque
    treinar leva alguns segundos."""
    key = f"{langs}|{cache_dir}"
    if key in _SCORER_CACHE:
        return _SCORER_CACHE[key]
    langs_l = [s.strip() for s in langs.split(",") if s.strip()]
    corpus = load_wordlist_raw(langs_l, cache_dir)
    model = MarkovNames(corpus, order=2) if len(corpus) >= 500 else None
    if model is None:
        print("  aviso: corpus insuficiente para pontuar; ordem original mantida")
    _SCORER_CACHE[key] = model
    return model


def run_rank(args) -> None:
    """Mostra os candidatos pendentes ordenados por qualidade, sem tocar na
    API. Use para escolher um --min-score antes de gastar o limite da conta."""
    store = Store(args.db)
    lengths = parse_lengths(args.length) if args.length else None
    pending = store.unverified(args.origin, lengths)
    badwords = BadWords.load(args.badwords, args.cache_dir, args.badword_mode,
                             getattr(args, "badword_file", None),
                             getattr(args, "allow_file", None), quiet=True)
    keep = make_filter(clean=args.clean, pronounceable=args.pronounceable,
                       badwords=badwords)
    pending = [n for n in pending if keep(n)]
    if not pending:
        print("Nada pendente com esses filtros.")
        store.close()
        return

    model = load_scorer(args.words or "en,pt", args.cache_dir)
    if not model:
        store.close()
        return
    scored = sorted(((model.score(n), n) for n in pending), reverse=True)

    print(f"{len(scored):,} candidatos pendentes\n")
    print("distribuicao (use como referencia para --min-score):")
    for pct in (10, 25, 50, 75, 90):
        s = scored[min(len(scored) - 1, len(scored) * pct // 100)][0]
        acima = sum(1 for x, _ in scored if x >= s)
        print(f"  top {pct:>2}% -> score {s:>6.2f}  ({acima:,} nomes, "
              f"{acima*17/3600:.1f}h de verify)")

    n = args.top
    print(f"\nMELHORES {n}:")
    for s, name in scored[:n]:
        print(f"  {name:<10} {s:>6.2f}")
    print(f"\nPIORES {n} (candidatos a --min-score cortar):")
    for s, name in scored[-n:]:
        print(f"  {name:<10} {s:>6.2f}")
    store.close()
    store = Store(args.db)
    write_report(store, args.out, only_available=args.verified_only)
    store.close()


def run_export(args) -> None:
    store = Store(args.db)
    write_report(store, args.out, only_available=args.verified_only)
    store.close()


def run_check(args) -> None:
    """Testa os filtros num nome (ou numa lista) sem tocar na API."""
    badwords = BadWords.load(args.badwords, args.cache_dir, args.badword_mode,
                             getattr(args, "badword_file", None),
                             getattr(args, "allow_file", None))
    for name in args.names:
        n = name.strip().lower()
        hit = badwords.hit(n)
        print(f"{n:<18} valido={valid_name(n)!s:<5} clean={n.isalpha()!s:<5} "
              f"pronunciavel={is_pronounceable(n)!s:<5} "
              f"palavrao={hit or '-'}")


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #

def add_shape_args(p: argparse.ArgumentParser) -> None:
    p.add_argument("--clean", action="store_true",
                   help="apenas letras (sem digito nem underline)")
    p.add_argument("--pronounceable", action="store_true",
                   help="apenas nomes que dao para falar em voz alta")
    p.add_argument("--pattern", default=None,
                   help="padrao fonetico: c=consoante v=vogal l=letra d=digito "
                        "x=qualquer. Ex: cvcv,ccvc. Aceita varios separados por virgula")


def add_badword_args(p: argparse.ArgumentParser) -> None:
    p.add_argument("--badwords", default=None,
                   help=f"idiomas do filtro de palavrao: {','.join(BADWORD_URLS)}. "
                        f"Sem isso, metade do dicionario ingles vira NOT_ALLOWED")
    p.add_argument("--badword-mode", choices=["smart", "strict", "off"],
                   default="smart",
                   help="smart (default) evita falso positivo tipo 'pass' -> 'ass'")
    p.add_argument("--badword-file", default=None, help="termos extras seus")
    p.add_argument("--allow-file", default=None,
                   help="nomes que o filtro deve deixar passar mesmo assim")
    p.add_argument("--cache-dir", default=".wordcache")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Varredura de nicks livres via API da Mojang.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--alphabet", default="full",
                        help="full | alnum | letters | digits, ou uma string literal")
    common.add_argument("--length", default=DEFAULT_LENGTH,
                        help=f"'4' | faixa '3-6' | 'all' ({MC_MIN_LEN}-{MC_MAX_LEN}) "
                             f"| lista '3,5'")
    common.add_argument("--rate", type=int, default=150,
                        help="requisicoes por janela (Mojang permite 200)")
    common.add_argument("--window", type=float, default=120.0, help="janela em segundos")
    common.add_argument("--user-agent", default=USER_AGENT)

    # -- estimate ---------------------------------------------------------- #
    e = sub.add_parser("estimate", parents=[common], help="so calcula volume e tempo")
    e.add_argument("--pattern", default=None)
    e.set_defaults(func=run_estimate)

    # -- fontes (compartilhado por quick e preview) ------------------------ #
    sources = argparse.ArgumentParser(add_help=False)
    sources.add_argument("--n", type=int, default=0,
                         help="quantos nomes ALEATORIOS sortear")
    sources.add_argument("--words", default=None,
                         help="idiomas de palavras reais, ex: en,pt")
    sources.add_argument("--wordfile", default=None, help="arquivo proprio com palavras")
    sources.add_argument("--max-words", type=int, default=0,
                         help="limitar a N palavras do dicionario")
    sources.add_argument("--leet", action="store_true",
                         help="gerar variantes leetspeak (cool -> c00l)")
    sources.add_argument("--leet-max", type=int, default=0,
                         help="maximo de variantes por palavra (0 = todas)")
    sources.add_argument("--markov", type=int, default=0,
                         help="gerar N nomes que PARECEM palavra (recomendado)")
    sources.add_argument("--markov-order", type=int, default=2,
                         help="2 = mais criativo, 3 = mais parecido com palavra real")
    sources.add_argument("--pattern-max", type=int, default=0,
                         help="amostrar no maximo N nomes por padrao (0 = todos)")
    sources.add_argument("--seed", type=int, default=None,
                         help="semente para reproduzir o sorteio")

    # -- preview ----------------------------------------------------------- #
    pv = sub.add_parser("preview", parents=[common, sources],
                        help="mostra o que seria gerado, sem tocar na API")
    add_shape_args(pv)
    add_badword_args(pv)
    pv.set_defaults(func=run_preview)

    # -- scan -------------------------------------------------------------- #
    s = sub.add_parser("scan", parents=[common], help="varredura exaustiva do espaco")
    s.add_argument("--db", default="nicks.db")
    s.add_argument("--concurrency", type=int, default=4)
    s.add_argument("--endpoint", choices=list(BULK_ENDPOINTS), default="services")
    add_shape_args(s)
    add_badword_args(s)
    s.set_defaults(func=run_scan)

    # -- quick ------------------------------------------------------------- #
    q = sub.add_parser("quick", parents=[common, sources],
                       help="monta amostra, filtra em lote e verifica de ponta a ponta")
    q.add_argument("--db", default="amostra.db")
    q.add_argument("--token", default=None, help="Minecraft access token (Bearer)")
    q.add_argument("--out", default="disponiveis.txt")
    q.add_argument("--endpoint", choices=list(BULK_ENDPOINTS), default="services")
    q.add_argument("--rate-verify", type=int, default=18)
    q.add_argument("--window-verify", type=float, default=300.0)
    q.add_argument("--min-score", type=float, default=None,
                   help="corte de qualidade na etapa 2")
    q.add_argument("--verify-limit", type=int, default=0,
                   help="verificar no maximo N nesta rodada")
    add_shape_args(q)
    add_badword_args(q)
    q.set_defaults(func=run_quick)

    # -- verify ------------------------------------------------------------ #
    v = sub.add_parser("verify", help="etapa 2: confirma AVAILABLE vs NOT_ALLOWED")
    v.add_argument("--db", default="nicks.db")
    v.add_argument("--token", required=True, help="Minecraft access token (Bearer)")
    v.add_argument("--limit", type=int, default=0, help="verificar apenas os N primeiros")
    v.add_argument("--origin", default=None,
                   help="origens: todos | words | leet | pattern | markov | random "
                        "| scan | gold,lobo")
    v.add_argument("--length", default=None, help="filtrar por comprimento: 4 | 3-5")
    v.add_argument("--rate", type=int, default=18, help="max 20 por janela")
    v.add_argument("--window", type=float, default=300.0)
    v.add_argument("--user-agent", default=USER_AGENT)
    v.add_argument("--min-score", type=float, default=None,
                   help="descartar nomes com score markov abaixo disto "
                        "(rode 'rank' antes para escolher o valor)")
    v.add_argument("--sort", choices=["score", "priority"], default="score",
                   help="score (default) = melhores primeiro")
    v.add_argument("--words", default="en,pt",
                   help="idiomas do modelo que pontua a qualidade")
    add_shape_args(v)
    add_badword_args(v)
    v.set_defaults(func=run_verify)

    # -- stats / export / check -------------------------------------------- #
    st = sub.add_parser("stats", help="candidatos por origem e comprimento")
    st.add_argument("--db", default="amostra.db")
    st.set_defaults(func=run_stats)

    rk = sub.add_parser("rank", help="ordena os pendentes por qualidade, sem API")
    rk.add_argument("--db", default="final.db")
    rk.add_argument("--origin", default=None)
    rk.add_argument("--length", default=None)
    rk.add_argument("--top", type=int, default=30)
    rk.add_argument("--words", default="en,pt")
    add_shape_args(rk)
    add_badword_args(rk)
    rk.set_defaults(func=run_rank)

    x = sub.add_parser("export", help="grava os nomes encontrados em txt")
    x.add_argument("--db", default="nicks.db")
    x.add_argument("--out", default="livres.txt")
    x.add_argument("--verified-only", action="store_true",
                   help="apenas os confirmados como AVAILABLE")
    x.set_defaults(func=run_export)

    c = sub.add_parser("check", help="testa os filtros num nome especifico")
    c.add_argument("names", nargs="+")
    add_badword_args(c)
    c.set_defaults(func=run_check)

    return p


def main() -> None:
    args = build_parser().parse_args()
    if inspect.iscoroutinefunction(args.func):
        asyncio.run(args.func(args))
    else:
        args.func(args)


if __name__ == "__main__":
    main()