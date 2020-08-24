
const SPOT_SIZE = 144

class Board {
    render() {
        const board = document.getElementById("board")
        board.innerHTML = ""

        this.renderSpots(board)
        this.renderSideSpots(board)
    }

    renderSpots(board) {
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 5; j++) {
                board.appendChild(this.getSpot(board, j, i))
            }
        }
    }

    getSpot(board, row, col) {
        const boardHeight = board.offsetHeight
        const x = board.getBoundingClientRect().left + 2*SPOT_SIZE
        const y = board.getBoundingClientRect().top + (boardHeight - (5*SPOT_SIZE))/2

        const spot = document.createElement("div")
        spot.className = "spot"
        spot.style.left = (x + col * SPOT_SIZE) + "px"
        spot.style.top = (y + row * SPOT_SIZE) + "px"

        return spot
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
        const x = leftSide ? board.getBoundingClientRect().left : (board.getBoundingClientRect().right - SPOT_SIZE*2)
        const y = board.getBoundingClientRect().top

        const spot = document.createElement("div")
        spot.className = "spot"
        spot.style.left = (x + col * SPOT_SIZE) + "px"
        spot.style.top = (y + row * SPOT_SIZE) + "px"
        spot.style.opacity = "0.75"

        return spot
    }
}

export default Board