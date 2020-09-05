import React, { useState } from "react"

function PlayerText({ text, highlight, isPlayer1 }) {
    const [ai, setAI] = useState(!isPlayer1)

    return (
        <div
            className={"player-text " + (isPlayer1 ? "p1-text" : "p2-text") + (highlight ? " text-highlight" : "")}
        >
            {text}

            {/* <div style={{ display: "flex", flexDirection: "row", justifyContent: "flex-start", alignItems: "center" }}>
                <label className="ai-label">A.I.</label>
                <input 
                    type="checkbox"
                    className="ios-switch tinyswitch"
                    checked={ai}
                    onChange={e => setAI(!ai)} />
                <div><div></div></div>
            </div> */}
        </div>
    )
}

export default PlayerText