import React, { useState, useRef, useEffect } from "react"
import cannon from "../assets/cannon.png"
import cannonBase from "../assets/cannon-base.png"
import { mousePos } from "./global"
import isNil from "lodash.isnil"

function Cannon({ hPos, vPos, deployed }) {
    const initialPosition = {
        [hPos]: "-117px",
        [vPos]: "-138px",
    }
    const deployedPosition = {
        [hPos]: "-29px",
        [vPos]: "-34px",
    }

    const cornerPos = {
        x: hPos === "left" ? 0 : window.innerWidth,
        y: vPos === "top" ? 0 : window.innerHeight,
    }

    const position = deployed ? deployedPosition : initialPosition
    const cannonRef = useRef()

    const style = { ...position }

    useEffect(() => {
        if (!deployed) return

        let keepGoing = true
        const animate = () => {
            if (isNil(cannonRef.current)) return

            const rotation =
                (Math.atan(
                    (mousePos.y - cornerPos.y) / (mousePos.x - cornerPos.x)
                ) *
                    180) /
                    Math.PI +
                (hPos === "right" ? -90 : 90)
            cannonRef.current.style.setProperty(
                "--cannon-rotate",
                rotation + "deg"
            )

            if (keepGoing) {
                window.requestAnimationFrame(animate)
            }
        }

        window.requestAnimationFrame(animate)

        return () => {
            keepGoing = false
        }
    }, [cannonRef.current, deployed])

    return (
        <>
            <img className="cannon-base" style={style} src={cannonBase} />
            <img
                ref={cannonRef}
                className="cannon"
                style={style}
                src={cannon}
            />
        </>
    )
}

export default Cannon
