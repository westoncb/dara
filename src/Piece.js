import React, { useState, useRef } from "react";

function Piece({
  id,
  size,
  pos,
  margin,
  boardPos,
  piecePickedUpFunc,
  pieceDroppedFunc,
  pieceDraggedFunc,
  pieceCanBeLifted,
}) {
  const [pickedUp, setPickedUp] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const refContainer = useRef(null);

  const handleMouseDown = (e) => {
    if (!pieceCanBeLifted(id)) return;

    setPickedUp(true);
    piecePickedUpFunc(id);

    if (refContainer.current) {
      refContainer.current.style.zIndex = "11";

      const bounds = refContainer.current.getBoundingClientRect();
      setOffset({ x: e.clientX - bounds.x, y: e.clientY - bounds.y });
    }
  };

  const handleMouseMove = (e) => {
    if (pickedUp) {
      const element = refContainer.current;
      const x = e.pageX - offset.x - boardPos.x;
      const y = e.pageY - offset.y - boardPos.y;
      element.style.setProperty("--translate-x", x + "px");
      element.style.setProperty("--translate-y", y + "px");

      pieceDraggedFunc(id, x, y);
    }
  };

  const drop = () => {
    setPickedUp(false);
    pieceDroppedFunc(id);

    if (refContainer.current) {
      refContainer.current.style.zIndex = "10";
    }
  };

  if (!pickedUp && refContainer.current) {
    const element = refContainer.current;
    const x = pos.x + margin / 2;
    const y = pos.y + margin / 2;
    element.style.setProperty("--translate-x", x + "px");
    element.style.setProperty("--translate-y", y + "px");
  }

  return (
    <>
      <div
        ref={refContainer}
        key={id}
        className={"piece piece-add" + (id > 12 ? " piece-p2" : "")}
        style={{
          width: size + "px",
          height: size + "px",
          transition: !pickedUp ? "all 150ms" : "none",
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={drop}
        onMouseMove={handleMouseMove}
      >
        |||
      </div>
      {pickedUp && (
        <div
          className="drag-surface"
          onMouseMove={handleMouseMove}
          onMouseUp={drop}
        ></div>
      )}
    </>
  );
}

export default Piece;
