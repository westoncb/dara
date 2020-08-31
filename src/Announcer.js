import React, {useRef} from "react"

function Announcer({text, xPos, swipeOut}) {

    const textRef = useRef(null)

    if (textRef.current) {
        const baseTransformString = "translate(-50%, -120%)"

        textRef.current.style.color = "#ec71ff"
        textRef.current.style.fontSize = "4rem"
        textRef.current.style.opacity = 1
        textRef.current.style.transform = baseTransformString
        textRef.current.style.textShadow = "#ec71ff 1px 0 10px"

        setTimeout(() => {
            textRef.current.style.color = "rgba(255, 255, 255, 0.2)"
            textRef.current.style.fontSize = "2.5rem"
            textRef.current.style.textShadow = ""

            if (swipeOut) {
                textRef.current.style.transform = baseTransformString + " translateX(1000px)"
                textRef.current.style.opacity = 0
            }
        }, 1500)
    }

    return (
        <span ref={textRef} className="announcer-text" style={{left: xPos+"px"}}>{text}</span>
    )
}

export default Announcer