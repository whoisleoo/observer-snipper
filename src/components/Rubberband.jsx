export default function RubberBand({ rect }) {
    if (!rect || rect.w < 4 || rect.h < 4) return null
  
    return (
      <div
        className="fixed z-30 pointer-events-none border border-white/25 bg-white/[0.07]"
        style={{
          left:   rect.x,
          top:    rect.y,
          width:  rect.w,
          height: rect.h,
        }}
      />
    )
  }