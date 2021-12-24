import React, { useState, useRef, useEffect } from "react"
import isNil from "lodash.isnil"
import hand from "../assets/hand2.png"
import { gameStates } from "./global"

const highlightPlayablePieces = false

const Piece = React.memo(function Piece({
    id,
    gameState,
    size,
    pos,
    boardPos,
    piecePickedUpFunc,
    pieceDroppedFunc,
    pieceDraggedFunc,
    pieceCanBeLifted,
    destroyPiece,
    destroyable,
    hidden,
    drawAIHand,
}) {
    const [pickedUp, setPickedUp] = useState(false)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const containerRef = useRef(null)

    const handlePointerDown = e => {
        if (!pieceCanBeLifted(id)) return

        setPickedUp(true)
        piecePickedUpFunc(id)

        if (containerRef.current) {
            containerRef.current.setPointerCapture(e.pointerId)
            containerRef.current.style.zIndex = "11"

            const bounds = containerRef.current.getBoundingClientRect()
            setOffset({ x: e.clientX - bounds.x, y: e.clientY - bounds.y })
        }
    }

    const handlePointerMove = e => {
        if (pickedUp) {
            const element = containerRef.current
            const x = e.clientX - offset.x - boardPos.x
            const y = e.clientY - offset.y - boardPos.y
            element.style.setProperty("--translate-x", x + "px")
            element.style.setProperty("--translate-y", y + "px")

            pieceDraggedFunc(id, x, y)
        }
    }

    const drop = e => {
        setPickedUp(false)
        pieceDroppedFunc(id)

        if (!isNil(containerRef.current)) {
            containerRef.current.releasePointerCapture(e.pointerId)
            containerRef.current.style.zIndex = "10"
        }
    }

    if (!pickedUp && !isNil(containerRef.current)) {
        const element = containerRef.current
        element.style.setProperty("--translate-x", pos.x + "px")
        element.style.setProperty("--translate-y", pos.y + "px")
    }

    const isPlayer1 = id < 13

    return (
        <>
            <div
                ref={containerRef}
                key={id}
                className={
                    (pieceCanBeLifted(id) && highlightPlayablePieces
                        ? "playable"
                        : "") +
                    " piece piece-add" +
                    (!isPlayer1 ? " piece-p2" : "")
                }
                style={{
                    width: size + "px",
                    height: size + "px",
                    contain: "size layout",
                    transition: !pickedUp
                        ? "transform 1s"
                        : hidden
                        ? "opacity 1s"
                        : "none",
                    zIndex: drawAIHand ? 12 : 11,
                    filter: drawAIHand
                        ? `drop-shadow(0px 0px 0.5rem #${
                              isPlayer1 ? "fffa95" : "4cd7d1"
                          })`
                        : "",
                    opacity: hidden ? 0.1 : 1,
                    cursor:
                        gameState === gameStates.DESTROY ? "none" : "pointer",
                }}
                onPointerDown={e => handlePointerDown(e)}
                onPointerUp={e => {
                    if (destroyable) {
                        destroyPiece(id)
                    } else {
                        drop(e)
                    }
                }}
                onPointerMove={e => handlePointerMove(e)}
            >
                <img
                    className="ai-hand"
                    src={hand}
                    alt=""
                    style={{
                        pointerEvents: "none",
                        opacity: drawAIHand ? 1 : 0,
                        draggable: false,
                    }}
                />
            </div>
        </>
    )
})

export default Piece
