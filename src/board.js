
const SPOT_SIZE = 144
const sections = {MAIN: 0, LEFT: 1, RIGHT: 2}

class Board {
    constructor() {
        window.onresize = () => {
            this.render(this.lastBoardState)
        }
        
        this.rand = []
        for (let i = 0; i < 24; i++) {
            this.rand[i] = Math.random()
        }

        // This works as an animation if you just use setInterval instead
        setTimeout(() => {
            const pieces = Array.from(document.getElementsByClassName('piece'))
            pieces.forEach((piece, i) => {
                const x = this.randRot(i, Math.random()*10000)
                const y = this.randRot(23 - i, Math.random() * 10000)
                piece.style.transform = `translate(-50%, -50%) rotateX(${x}deg) rotateY(${y}deg)`
            })
        }, 500)
    }

    randRot(i, time) {
        return Math.sin((this.rand[i]) * 2 * time / 1000 + this.rand[i] * Math.PI) * 10
    }

    render(boardState) {
        const board = document.getElementById("board")
        board.innerHTML = ""

        this.renderSpots(board)
        // this.renderSideSpots(board)
        this.renderPieces(boardState)

        this.lastBoardState = boardState
    }

    renderPieces(boardState) {
        const board = document.getElementById("board")
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 6; j++) {
                this.renderPieceAtSlot(i, j, sections.main, boardState, board)
            }
        }

        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 2; j++) {
                this.renderPieceAtSlot(i, j, sections.LEFT, boardState, board)
                this.renderPieceAtSlot(i, j, sections.RIGHT, boardState, board)
            }
        }
    }

    renderPieceAtSlot(row, col, section, boardState, board) {
        let slotState = 0

        switch (section) {
            case sections.MAIN:
                slotState = boardState[row + "," + col]
                break;
            case sections.LEFT:
                slotState = boardState.lSide[row + "," + col]
                break;
            case sections.RIGHT:
                slotState = boardState.rSide[row + "," + col]
                break;
        }

        const piece = this.getPiece(slotState)

        // console.log(slotState, piece)
        
        if (piece) {
            let pos
            switch (section) {
                case sections.MAIN:
                    pos = this.getSpotPos(board, row, col)
                    break;
                case sections.LEFT:
                    pos = this.getSideSpotPos(board, true, row, col)
                    break;
                case sections.RIGHT:
                    pos = this.getSideSpotPos(board, false, row, col)
                    break;
            }

            piece.style.left = pos.x + "px"
            piece.style.top = pos.y + "px"
        }
    }

    getPiece(id) {
        if (id === 0)
            return null

        let piece = document.getElementById(`piece-${id}`)

        if (!piece) {
            piece = document.createElement("div")
            piece.className = `piece piece-add ${id > 12 ? "piece-p2" : ""}`
            board.appendChild(piece)
        }

        return piece
    }

    renderSpots(board) {
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 5; j++) {
                board.appendChild(this.getSpot(board, j, i))
            }
        }
    }

    getSpot(board, row, col) {
        const spot = document.createElement("div")
        const {x, y} = this.getSpotPos(board, row, col)
        spot.className = "spot"
        spot.style.left = x + "px"
        spot.style.top = y + "px"

        return spot
    }

    getSpotPos(board, row, col) {
        const boardHeight = board.offsetHeight
        const x = board.getBoundingClientRect().left + 2 * SPOT_SIZE
        const y = board.getBoundingClientRect().top + (boardHeight - (5 * SPOT_SIZE)) / 2

        return { x: (x + col * SPOT_SIZE + SPOT_SIZE / 2), y: (y + row * SPOT_SIZE + SPOT_SIZE / 2) }
    }

    renderSideSpots(board) {
        for (let k = 0; k < 2; k++) {
            for (let i = 0; i < 2; i++) {
                for (let j = 0; j < 6; j++) {
                    board.appendChild(this.getSideSpot(board, k==0, j, i))
                }
            }
        }
    }

    getSideSpot(board, leftSide, row, col) {
        const spot = document.createElement("div")
        const {x, y} = this.getSideSpotPos(board, leftSide, row, col)
        spot.className = "spot side-spot"
        spot.style.left = x + "px"
        spot.style.top = y + "px"

        return spot
    }

    getSideSpotPos(board, leftSide, row, col) {
        const x = leftSide ? board.getBoundingClientRect().left : (board.getBoundingClientRect().right - SPOT_SIZE * 2)
        const y = board.getBoundingClientRect().top

        return { x: (x + col * SPOT_SIZE + SPOT_SIZE/2), y: (y + row * SPOT_SIZE + SPOT_SIZE/2)}
    }
}

export default Board