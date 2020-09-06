import React, { useState } from "react"

function PlayerText({ text, highlight, isPlayer1 }) {
    const [ai, setAI] = useState(!isPlayer1)

    return (
        <div
            className={"player-text-container " + (isPlayer1 ? "p1-text" : "p2-text")}
        >
            <div className={(highlight ? " text-highlight" : "")}>
                {text}
            </div>

            <div className="toggle-container">
                <span className="ai-label">A.I.</span>
                <input type="checkbox" id={"cb" + (isPlayer1 ? "p1" : "p2")} className="tgl tgl-ios" />
                <label className="tgl-btn" htmlFor={"cb" + (isPlayer1 ? "p1" : "p2")}></label>

            </div>
        </div>
    )
}

export default PlayerText