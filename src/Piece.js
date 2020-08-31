import React, {useState, useRef, useEffect} from "react"

function Piece({id, size, pos, margin, boardPos}) {

    const [mouseDown, setMouseDown] = useState(false)
    const [offset, setOffset] = useState({x: 0, y: 0})
    const [dragPos, setDragPos] = useState(null)
    const refContainer = useRef(null)

    const handleMouseDown = e => {
        setMouseDown(true)

        if (refContainer.current) {
            refContainer.current.style.zIndex = "11"

            const bounds = refContainer.current.getBoundingClientRect()
            setOffset({ x: e.clientX - bounds.x, y: e.clientY - bounds.y })
        }
    }

    const handleMouseMove = e => {
        if (mouseDown) {
            setDragPos({x: e.pageX - offset.x, y: e.pageY - offset.y})
        }
    }

    const drop = () => {
        setMouseDown(false)
        setDragPos(null)
        if (refContainer.current) {
            refContainer.current.style.zIndex = "10"
        }   
    }

    if (refContainer.current) {
        const element = refContainer.current
        const x = dragPos ? dragPos.x - boardPos.x: pos.x + margin / 2
        const y = dragPos ? dragPos.y - boardPos.y: pos.y + margin / 2
        element.style.setProperty("--translate-x", x + "px")
        element.style.setProperty("--translate-y", y + "px")
    }

    return (
        <>
            <div 
            ref={refContainer}
            key={id} 
            className={"piece piece-add" + (id > 12 ? " piece-p2" : "")}
            style={{ width: size + "px", height: size + "px", transition: !mouseDown ? "all 150ms" : "none" }}
            onMouseDown={handleMouseDown}
            onMouseUp={drop}
            onMouseMove={handleMouseMove}
        >
            |||   
        </div>
            {mouseDown && <div className="drag-surface" onMouseMove={handleMouseMove} onMouseUp={drop}></div> }
        </>
    )
}

export default Piece