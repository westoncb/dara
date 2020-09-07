class BoardOps {
    movePieceFromTo(oldRow, oldCol, newRow, newCol, pieceId) {
        const sections = this.setSpotState(oldRow, oldCol, 0, oldSection)
        this.setSpotState(newRow, newCol, pieceId, sections.main)
    }
}

export default BoardOps
