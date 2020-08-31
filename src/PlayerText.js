import React from "react"

function PlayerText({text, highlight, isPlayer1, boardRightX}) {

    return (
        <div 
            className={"player-text " + (isPlayer1 ? "p1-text" : "p2-text") + (highlight ? " text-highlight" : "")}
            >
            {text}
        </div>
    )
}

export default PlayerText