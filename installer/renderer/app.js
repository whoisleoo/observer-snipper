(() => {
    const screens = document.querySelectorAll(".screen");
    const showScreen = (name) => {
        screens.forEach((el) => el.classList.toggle("active", el.dataset.screen === name));
    };

    document.getElementById("btn-minimize").addEventListener("click", () => window.installer.minimize());
    document.getElementById("btn-close").addEventListener("click", () => window.installer.close());
    document.querySelectorAll('[data-action="cancel"]').forEach((btn) => {
        btn.addEventListener("click", () => window.installer.close());
    });

    let info = null;
    let installDir = "";
    let lastFailedFrom = "welcome";

    function setProgress(percent, label) {
        document.getElementById("progress-fill").style.width = `${percent}%`;
        if (label) document.getElementById("progress-label").textContent = label;
    }

    window.installer.onProgress(({ percent, label }) => setProgress(percent, label));

    window.installer.onFailed(({ message }) => {
        document.getElementById("error-message").textContent = message;
        showScreen("error");
    });

    window.installer.onComplete(({ mode }) => {
        if (mode === "install") {
            document.getElementById("done-title").textContent = "Observer instalado";
            document.getElementById("done-body").textContent = "A instalação foi concluída com sucesso.";
            document.getElementById("done-launch-row").style.display = "flex";
        } else {
            document.getElementById("done-title").textContent = "Observer foi desinstalado";
            document.getElementById("done-body").textContent = "A remoção foi concluída com sucesso.";
            document.getElementById("done-launch-row").style.display = "none";
        }
        showScreen("done");
    });

    document.getElementById("btn-finish").addEventListener("click", () => {
        if (info.mode === "install") {
            if (document.getElementById("chk-launch-after").checked) {
                window.installer.openApp(installDir);
            } else {
                window.installer.close();
            }
        } else {
            window.installer.finishUninstallAndQuit(installDir);
        }
    });

    document.getElementById("btn-retry").addEventListener("click", () => showScreen(lastFailedFrom));

    async function initInstallMode() {
        installDir = info.defaultInstallDir;
        document.getElementById("install-dir").value = installDir;

        if (!info.payloadAvailable) {
            document.getElementById("welcome-body").textContent =
                'Payload do app não encontrado. Rode "npm run pack:app" antes de gerar o instalador.';
            document.getElementById("welcome-continue").disabled = true;
        }

        document.getElementById("welcome-continue").addEventListener("click", () => showScreen("options"));
        document.querySelector('[data-action="back-to-welcome"]').addEventListener("click", () => showScreen("welcome"));

        document.getElementById("btn-choose-dir").addEventListener("click", async () => {
            const picked = await window.installer.pickDirectory(installDir);
            if (picked) {
                installDir = picked;
                document.getElementById("install-dir").value = installDir;
            }
        });

        document.getElementById("btn-start-install").addEventListener("click", () => {
            lastFailedFrom = "options";
            setProgress(0, "Preparando…");
            document.getElementById("progress-title").textContent = "Instalando…";
            showScreen("progress");
            window.installer.startInstall({
                installDir,
                desktopShortcut: document.getElementById("chk-desktop-shortcut").checked,
                startMenuShortcut: document.getElementById("chk-startmenu-shortcut").checked,
            });
        });
    }

    function initUninstallMode() {
        installDir = info.installDir;
        document.getElementById("titlebar-label").textContent = "Desinstalar Observer";
        document.getElementById("welcome-title").textContent = "Desinstalar Observer";
        document.getElementById("welcome-body").textContent =
            "Este assistente vai remover o Observer do seu computador.";
        document.getElementById("uninstall-dir").value = installDir;

        document.getElementById("welcome-continue").addEventListener("click", () => showScreen("uninstall-confirm"));

        document.getElementById("btn-start-uninstall").addEventListener("click", () => {
            lastFailedFrom = "uninstall-confirm";
            setProgress(0, "Preparando…");
            document.getElementById("progress-title").textContent = "Desinstalando…";
            showScreen("progress");
            window.installer.startUninstall({
                installDir,
                removeUserData: document.getElementById("chk-remove-data").checked,
            });
        });
    }

    (async () => {
        info = await window.installer.getInfo();
        if (info.mode === "install") {
            await initInstallMode();
        } else {
            initUninstallMode();
        }
        showScreen("welcome");
    })();
})();
