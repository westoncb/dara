import React, { useState, useRef, useEffect } from "react"
import { mousePos } from "../lib/global"
import isNil from "lodash.isnil"
import crosshair from "../../assets/crosshair.png"

function Crosshair() {
    const crosshairRef = useRef()

    useEffect(() => {
        let keepGoing = true
        const animate = () => {
            if (isNil(crosshairRef.current)) return

            crosshairRef.current.style.setProperty(
                "--crosshair-translate-x",
                mousePos.x - 32 + "px"
            )
            crosshairRef.current.style.setProperty(
                "--crosshair-translate-y",
                mousePos.y - 32 + "px"
            )

            if (keepGoing) {
                window.requestAnimationFrame(animate)
            }
        }

        window.requestAnimationFrame(animate)

        return () => {
            keepGoing = false
        }
    }, [crosshairRef.current])

    return <img ref={crosshairRef} className="crosshair-img" src={crosshair} />
}

export default Crosshair
