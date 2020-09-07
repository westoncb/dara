import React from "react"
import debounce from "lodash.debounce"
import Announcer from "./Announcer"
import Piece from "./Piece"
import PlayerText from "./PlayerText"

const sections = {
    MAIN: 0,
    LEFT: 1,
    RIGHT: 2,
}
const gameStates = {
    DROP: 0,
    MOVE: 1,
}
const players = {
    P1: 1,
    P2: 2,
}
const directions = {
    UP: 0,
    DOWN: 1,
    LEFT: 2,
    RIGHT: 3,
}
const messages = {
    gameStart: "Game Start!",
    dropPhase: "Drop phase",
    movePhase: "Move phase",
}

class Board extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            boardState: this.getEmptyBoard(),
            boardWidth: 1,
            boardHeight: 1,
            centerStartX: 1,
            centerEndX: 1,
            spotSize: 1,
            effects: true,
            announcement: "",
            boardBounds: {
                x: 1,
                y: 1,
                width: 1,
                height: 1,
            },
            pickedUpPiece: null,
            gameState: gameStates.DROP,
            activePlayer: players.P1,
            selectedBoardPos: {
                row: -1,
                col: -1,
            },
        }

        this.boardRef = React.createRef()
    }

    movePieceTo(newRow, newCol, pieceId, destSection = sections.MAIN) {
        const oldLocation = this.findLocationWithPiece(pieceId)

        this.setSpotState(
            oldLocation.row,
            oldLocation.col,
            0,
            oldLocation.section
        )
        this.setSpotState(newRow, newCol, pieceId, destSection)
    }

    onResize = () => {
        const {
            width,
            height,
            centerStartX,
            centerEndX,
            centerGap,
        } = this.getBoardDimensions()

        this.setState({
            boardWidth: width,
            boardHeight: height,
            centerStartX,
            centerEndX,
            spotSize: height / 6,
            centerGap,
            boardBounds: this.boardRef.current.getBoundingClientRect(),
        })
    }

    componentDidMount() {
        window.onresize = debounce(this.onResize, 60)

        this.onResize()

        this.setState({
            announcement: messages.gameStart,
        })

        setTimeout(() => {
            this.setState({
                announcement: messages.dropPhase,
            })
        }, 1750)

        // this.play()
    }

    async play() {
        const timedMove = () => {
            return new Promise((resolve, reject) => {
                this.makeMove()

                setTimeout(() => {
                    resolve()
                }, 2000)
            })
        }

        while (true) {
            await timedMove()
        }
    }

    makeMove() {
        if (this.state.gameState === gameStates.DROP) {
            // find piece from own side
            // do: choose random board location; while: !selectedLocationValid()

            const piece = this.findUnplayedPiece(this.state.activePlayer)
        }

        console.log("made move")
    }

    sectionStateToID(sectionState) {
        if (sectionState === this.state.boardState) return sections.MAIN
        if (sectionState === this.state.boardState.lSide) return sections.LEFT
        if (sectionState === this.state.boardState.rSide) return sections.RIGHT
    }

    findUnplayedPiece(player) {
        const sideState =
            player === players.P1
                ? this.state.boardState.lSide
                : this.state.boardState.rSide

        return sideState.find((spotState) => spotState !== 0)
    }

    getBoardDimensions() {
        const app = document.getElementById("app")

        // (vertical_pieces / horizontal_pieces) - 2.5% of width gap size between center and each side area
        const aspectRatio = 6 / (6 + 4) - 0.05

        const width = app.offsetWidth * 0.85
        const noGapWidth = app.offsetWidth * 0.8
        const height = width * aspectRatio
        const gap = (width - noGapWidth) / 2

        const centerStartX = noGapWidth * (2 / 10) + gap
        const centerEndX = centerStartX + noGapWidth * (6 / 10)

        return {
            width,
            height,
            centerStartX,
            centerEndX,
            centerGap: gap,
        }
    }

    render() {
        const { width, height } = this.getBoardDimensions()
        const announcementXPos = this.boardRef.current
            ? this.boardRef.current.offsetWidth / 2
            : 0

        return (
            <div
                ref={this.boardRef}
                id="board"
                style={{
                    width: width + "px",
                    height: height + "px",
                }}
            >
                <Announcer
                    text={this.state.announcement}
                    xPos={announcementXPos}
                    swipeOut={this.state.announcement === messages.gameStart}
                />{" "}
                <PlayerText
                    text={"Player 1"}
                    isPlayer1
                    highlight={this.state.activePlayer === players.P1}
                />{" "}
                <PlayerText
                    text={"Player 2"}
                    highlight={this.state.activePlayer === players.P2}
                    boardRightX={
                        this.state.boardBounds.x + this.state.boardBounds.width
                    }
                />{" "}
                {this.renderPieces().concat(this.renderSpots())}{" "}
            </div>
        )
    }

    finishTurn() {
        this.setState((state) => {
            return {
                activePlayer:
                    state.activePlayer === players.P1 ? players.P2 : players.P1,
            }
        })
    }

    piecePickedUp(id) {
        this.setState({
            pickedUpPiece: id,
        })
    }

    pieceDropped(id) {
        this.setState({
            pickedUpPiece: null,
        })
        const { row, col } = this.state.selectedBoardPos

        if (this.isMoveLegal(row, col, id, this.state.activePlayer)) {
            this.movePieceTo(row, col, id)

            this.finishTurn()
        }
    }

    pieceDragged(id, mouseX, mouseY) {
        const { row, col } = this.getSpotRowColForXY(
            mouseX + this.state.spotSize / 2,
            mouseY + this.state.spotSize / 2
        )

        if (
            row !== this.state.selectedBoardPos.row ||
            col !== this.state.selectedBoardPos.col
        ) {
            this.setState({
                selectedBoardPos: {
                    row,
                    col,
                },
            })
        }
    }

    findLocationWithPiece(pieceId) {
        return [
            this.state.boardState,
            this.state.boardState.lSide,
            this.state.boardState.rSide,
        ]
            .map((sectionState) => {
                const resultKey = Object.keys(sectionState).find(
                    (key) => sectionState[key] === pieceId
                )

                return resultKey !== undefined
                    ? {
                          section: this.sectionStateToID(sectionState),
                          row: resultKey.split(",")[0],
                          col: resultKey.split(",")[1],
                      }
                    : null
            })
            .find((result) => result !== null)
    }

    isMoveLegal(row, col, pieceId, player) {
        const spotState = this.getSpotState(row, col)
        const isSpotOccupied = spotState !== 0
        const makes3InARow = this.moveMakes3InARow(row, col, player)

        return !isSpotOccupied && !makes3InARow
    }

    moveMakes3InARow(row, col, player) {
        const chainLengths = [
            directions.UP,
            directions.DOWN,
            directions.LEFT,
            directions.RIGHT,
        ]
            .map((direction) =>
                this.chainLengthInDirection(player, row, col, direction)
            )
            .sort((a, b) => b - a) // descending order

        if (chainLengths[0] > 1) {
            return true
        } else {
            return false
        }
    }

    chainLengthInDirection(player, originRow, originCol, direction) {
        let count = 0
        let neighbor
        let stillGoing = true
        let nextRow = originRow
        let nextCol = originCol

        do {
            neighbor = this.getNeighbor(nextRow, nextCol, direction)
            stillGoing = this.pieceOwner(neighbor.state) === player

            if (stillGoing) {
                count++
                nextRow = neighbor.row
                nextCol = neighbor.col
            }
        } while (stillGoing)

        return count
    }

    getNeighbor(row, col, direction) {
        const rowAdder =
            direction === directions.UP
                ? -1
                : direction === directions.DOWN
                ? 1
                : 0
        const colAdder =
            direction === directions.LEFT
                ? -1
                : direction === directions.RIGHT
                ? 1
                : 0

        // console.log("RADDER, COLADDER", rowAdder, colAdder)

        const neighborRow = row + rowAdder
        const neighborCol = col + colAdder
        return {
            row: neighborRow,
            col: neighborCol,
            state: this.getSpotState(neighborRow, neighborCol),
        }
    }

    getSpotState(row, col, section = sections.MAIN) {
        switch (section) {
            case sections.MAIN:
                return this.state.boardState[row + "," + col]
            case sections.LEFT:
                return this.state.boardState.lSide[row + "," + col]
            case sections.RIGHT:
                return this.state.boardState.rSide[row + "," + col]
        }
    }

    setSpotState(row, col, spotState, section = sections.MAIN) {
        this.setState((state) => {
            const boardState = state.boardState
            let newState

            switch (section) {
                case sections.MAIN:
                    newState = {
                        ...boardState,
                        [row + "," + col]: spotState,
                    }
                    break
                case sections.LEFT:
                    newState = {
                        ...boardState,
                        lSide: {
                            ...boardState.lSide,
                            [row + "," + col]: spotState,
                        },
                    }
                    break
                case sections.RIGHT:
                    newState = {
                        ...boardState,
                        rSide: {
                            ...boardState.rSide,
                            [row + "," + col]: spotState,
                        },
                    }
                    break
            }

            return { boardState: newState }
        })
    }

    renderPieces() {
        const pieces = []

        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 6; j++) {
                pieces.push(this.renderPieceAtSlot(i, j, sections.MAIN))
            }
        }

        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 2; j++) {
                pieces.push(this.renderPieceAtSlot(i, j, sections.LEFT))
                pieces.push(this.renderPieceAtSlot(i, j, sections.RIGHT))
            }
        }

        return pieces
    }

    renderSpots() {
        const spots = []
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 6; j++) {
                const { x, y } = this.getSpotPos(i, j)
                const margin = this.state.spotSize * 0.15
                const transformString = `translate(${x + margin / 2}px, ${
                    y + margin / 2
                }px)`

                let bgColor = "#222"

                let filterStr = ""

                if (this.state.pickedUpPiece) {
                    if (
                        this.isMoveLegal(
                            i,
                            j,
                            this.state.pickedUpPiece,
                            this.state.activePlayer
                        )
                    ) {
                        if (
                            i === this.state.selectedBoardPos.row &&
                            j === this.state.selectedBoardPos.col
                        ) {
                            filterStr = this.state.effects
                                ? "drop-shadow(0px 0px 1rem #0f9)"
                                : ""
                            bgColor = "#4e504e"
                        }
                    }
                }

                spots.push(
                    <div
                        key={i + "," + j + "_spot"}
                        className="spot"
                        style={{
                            backgroundColor: bgColor,
                            transform: transformString,
                            width: this.state.spotSize - margin,
                            height: this.state.spotSize - margin,
                            filter: filterStr,
                        }}
                    ></div>
                )
            }
        }

        return spots
    }

    renderPieceAtSlot(row, col, section) {
        let id = this.getSpotState(row, col, section)

        if (id === 0) return null
        else {
            let pos
            switch (section) {
                case sections.MAIN:
                    pos = this.getSpotPos(row, col)
                    break
                case sections.LEFT:
                    pos = this.getSideSpotPos(true, row, col)
                    break
                case sections.RIGHT:
                    pos = this.getSideSpotPos(false, row, col)
                    break
            }

            const pieceMargin = this.state.spotSize * 0.25
            const pieceSize = this.state.spotSize - pieceMargin

            return (
                <Piece
                    key={id}
                    id={id}
                    pos={pos}
                    margin={pieceMargin}
                    size={pieceSize}
                    boardPos={this.state.boardBounds}
                    pieceDroppedFunc={this.pieceDropped.bind(this)}
                    piecePickedUpFunc={this.piecePickedUp.bind(this)}
                    pieceDraggedFunc={this.pieceDragged.bind(this)}
                    pieceCanBeLifted={this.pieceCanBeLifted.bind(this)}
                />
            )
        }
    }

    pieceCanBeLifted(id) {
        if (this.state.gameState === gameStates.DROP) {
            return (
                this.pieceBelongsToActivePlayer(id) &&
                !this.pieceIsOnMainSection(id)
            )
        }
    }

    pieceBelongsToActivePlayer(pieceId) {
        return this.pieceOwner(pieceId) === this.state.activePlayer
    }

    pieceOwner(pieceId) {
        if (pieceId > 0 && pieceId < 13) return players.P1
        else if (pieceId > 12) return players.P2
    }

    pieceIsOnMainSection(id) {
        return Object.values(this.state.boardState).includes(id)
    }

    getSpotPos(row, col) {
        const spotSize = this.state.spotSize
        const x = this.state.centerStartX
        const y = this.state.spotSize / 2

        return {
            x: x + col * spotSize,
            y: y + row * spotSize,
        }
    }

    getSpotRowColForXY(x, y) {
        const spotSize = this.state.spotSize

        x -= this.state.centerStartX
        y -= spotSize / 2

        const col = Math.floor(x / spotSize)
        const row = Math.floor(y / spotSize)

        return {
            row,
            col,
        }
    }

    getSideSpotPos(leftSide, row, col) {
        const spotSize = this.state.spotSize
        const x = leftSide ? 0 : this.state.centerEndX + this.state.centerGap
        const y = 0

        return {
            x: x + col * spotSize,
            y: y + row * spotSize,
        }
    }

    getEmptyBoard() {
        const board = {}
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 6; j++) {
                board[i + "," + j] = 0
            }
        }

        board.lSide = {}
        board.rSide = {}

        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 2; j++) {
                board.lSide[i + "," + j] = 1 + i * 2 + j
                board.rSide[i + "," + j] = 24 - (i * 2 + j)
            }
        }

        return board
    }
}

export default Board
