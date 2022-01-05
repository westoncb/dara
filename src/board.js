import React from "react"
import debounce from "lodash.debounce"
import Announcer from "./Announcer"
import Piece from "./Piece"
import PlayerText from "./PlayerText"
import isEmpty from "lodash.isempty"
import { mousePos, gameStates } from "./global"
import Cannon from "./Cannon"
import Crosshair from "./Crosshair"

const showDebugState = false
const fastForwardAI = true

const AI_MOVE_DELAY = gameState =>
    gameState === gameStates.DROP && fastForwardAI ? 40 : 1200
const AI_ANIM_TIME = gameState =>
    gameState === gameStates.DROP && fastForwardAI ? 40 : 1000

const sections = {
    MAIN: 0,
    LEFT: 1,
    RIGHT: 2,
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
    seekPhase: "Seek and destroy!",
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
            p1AI: false,
            p2AI: false,
            aiMakingMove: false,
            aiMovePending: true,
            aiSelection: { row: -1, col: -1 },
            errorMessage: null,
        }

        const oldErrorFunc = console.error
        console.error = (...args) => {
            oldErrorFunc(args)
            const message = args.reduce((accum, next) => {
                return accum + next
            })
            this.setState({ errorMessage: message })
        }

        this.boardRef = React.createRef()
        this.canvasRef = React.createRef()
    }

    movePieceTo(newRow, newCol, pieceId, callback = () => {}) {
        const oldLocation = this.findLocationWithPiece(pieceId)

        let updatedState = this.setSpotState(
            oldLocation.row,
            oldLocation.col,
            0,
            true,
            this.state,
            oldLocation.section
        )
        updatedState = this.setSpotState(
            newRow,
            newCol,
            pieceId,
            true,
            updatedState,
            sections.MAIN
        )

        // Having to do it this weird way since
        // React doesn't batch updates unless they originate
        // from lifecycle methods
        this.setState(updatedState, callback)
    }

    onResize = () => {
        const { width, height, centerStartX, centerEndX, centerGap } =
            this.getBoardDimensions()

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
        window.onresize = debounce(this.onResize.bind(this), 60)
        window.addEventListener(
            "deviceorientation",
            e => {
                this.onResize()
            },
            true
        )
        window.addEventListener("mousemove", e => {
            mousePos.x = e.clientX
            mousePos.y = e.clientY
        })

        this.onResize()

        this.setState({
            announcement: messages.gameStart,
        })

        setTimeout(() => {
            this.setState({
                announcement: messages.dropPhase,
            })
        }, 1750)
    }

    isAI(player) {
        return (
            (player === players.P1 && this.state.p1AI) ||
            (player === players.P2 && this.state.p2AI)
        )
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        const state = this.state

        if (state.aiMovePending && this.isAI(state.activePlayer)) {
            this.aiTurnWithDuration()
        }
    }

    aiTurnWithDuration() {
        this.setState(
            state => {
                return {
                    aiMakingMove: true,
                    aiMovePending: false,
                }
            },
            () => {
                const { pieceId, row, col } = this.generateAIMove()

                if (this.state.gameState === gameStates.DESTROY) {
                    setTimeout(() => {
                        setTimeout(() => {
                            this.setState({ aiSelection: { row, col } }, () => {
                                this.destroyPiece(pieceId)
                            })
                        }, AI_ANIM_TIME(this.state.gameState))
                    }, AI_MOVE_DELAY(this.state.gameState))
                } else {
                    this.setState({ aiSelection: { row, col } }, () => {
                        setTimeout(() => {
                            const oldLocation =
                                this.findLocationWithPiece(pieceId)
                            this.movePieceTo(row, col, pieceId, () => {
                                setTimeout(() => {
                                    this.finishTurn(
                                        this.moveMakes3InARow(
                                            row,
                                            col,
                                            this.state.activePlayer,
                                            oldLocation.row,
                                            oldLocation.col
                                        )
                                    )
                                }, AI_ANIM_TIME(this.state.gameState))
                            })
                        }, AI_MOVE_DELAY(this.state.gameState))
                    })
                }
            }
        )
    }

    generateAIMove() {
        const player = this.state.activePlayer

        if (this.state.gameState === gameStates.DROP) {
            const pieceId = this.findUnplayedPiece(player)
            const legalMoves = this.getLegalMoves(player)

            const [row, col] =
                legalMoves[Math.floor(Math.random() * (legalMoves.length - 1))]

            return { pieceId, row, col }
        } else if (this.state.gameState === gameStates.MOVE) {
            const playerPieces = this.getPlayerPieces(player)

            const scoredMoves = playerPieces.reduce((allMoves, pieceId) => {
                const location = this.findLocationWithPiece(pieceId)
                const lastRow = location.row
                const lastCol = location.col

                const movesForPiece = this.getLegalMoves(
                    player,
                    lastRow,
                    lastCol
                )

                return allMoves.concat(
                    movesForPiece.map(move => ({
                        pieceId,
                        lastCoords: [lastRow, lastCol],
                        row: move[0],
                        col: move[1],
                        score: this.scoreCandidateMove(
                            move[0],
                            move[1],
                            player,
                            lastRow,
                            lastCol
                        ),
                    }))
                )
            }, [])

            scoredMoves.sort((move1, move2) => {
                return move2.score - move1.score
            })

            const topMoves = scoredMoves.filter(move => {
                const scoreDiff = move.score - scoredMoves[0].score

                console.assert(
                    scoreDiff <= 0,
                    "Something went wrong: highest score was not first element."
                )

                return scoreDiff === 0
            })

            const randIndex = Math.floor(Math.random() * (topMoves.length - 1))

            return topMoves[randIndex]
        } else if (this.state.gameState === gameStates.DESTROY) {
            const legalMoves = this.getLegalMoves(player)
            const randIndex = Math.floor(
                Math.random() * (legalMoves.length - 1)
            )
            const [row, col] = legalMoves[randIndex]
            const pieceId = this.getSpotState(row, col)

            return { pieceId, row, col }
        }
    }

    coordsFromKey(key) {
        return key.split(",").map(s => Number(s))
    }

    coordsToKey(row, col) {
        return row + "," + col
    }

    sectionStateToID(sectionState) {
        if (sectionState === this.state.boardState.main) return sections.MAIN
        if (sectionState === this.state.boardState.lSide) return sections.LEFT
        if (sectionState === this.state.boardState.rSide) return sections.RIGHT
    }

    findUnplayedPiece(player) {
        const sideState =
            player === players.P1
                ? this.state.boardState.lSide
                : this.state.boardState.rSide

        return Object.values(sideState).find(spotState => spotState !== 0)
    }

    getPlayerPieces(player) {
        const boardState = this.state.boardState
        const spots = Object.values(boardState.lSide)
            .concat(Object.values(boardState.rSide))
            .concat(Object.values(boardState.main))

        return spots.filter(
            spotState =>
                spotState !== 0 && this.pieceOwner(spotState) === player
        )
    }

    getFreeSpaces() {
        return Object.keys(this.state.boardState.main).filter(boardLoc => {
            this.state.boardState.main[boardLoc] === 0
        })
    }

    getBoardDimensions() {
        const app = document.getElementById("app")

        // (vertical_pieces / horizontal_pieces) - 2.5% of width gap size between center and each side area
        const aspectRatio = 6 / (6 + 4) - 0.05

        let width = app.offsetWidth * 0.85
        let noGapWidth = app.offsetWidth * 0.8
        let height = width * aspectRatio

        if (height > app.offsetHeight * 0.6) {
            height = app.offsetHeight * 0.6
            width = height / aspectRatio
            noGapWidth = height / (aspectRatio + 0.05)
        }

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
        const destroyMode = this.state.gameState === gameStates.DESTROY

        return (
            <>
                {destroyMode && (
                    <Crosshair
                        aiMakingMove={this.state.aiMakingMove}
                        aiSelection={this.state.aiSelection}
                    />
                )}
                <Cannon hPos="left" vPos="top" deployed={destroyMode} />
                <Cannon hPos="right" vPos="top" deployed={destroyMode} />
                <Cannon hPos="right" vPos="bottom" deployed={destroyMode} />
                <Cannon hPos="left" vPos="bottom" deployed={destroyMode} />
                <div
                    ref={this.boardRef}
                    id="board"
                    className="no-select"
                    style={{
                        width: width + "px",
                        height: height + "px",
                    }}
                >
                    {!isEmpty(this.state.errorMessage) && (
                        <div className="error-message">
                            {this.state.errorMessage}
                        </div>
                    )}
                    <Announcer
                        text={this.state.announcement}
                        xPos={announcementXPos}
                        swipeOut={
                            this.state.announcement === messages.gameStart
                        }
                    />{" "}
                    <div className="player-text-container">
                        <PlayerText
                            text={"Player 1"}
                            isPlayer1
                            highlight={this.state.activePlayer === players.P1}
                            setUseAI={useAI =>
                                this.handleAIToggle(useAI, players.P1)
                            }
                        />
                        <PlayerText
                            text={"Player 2"}
                            highlight={this.state.activePlayer === players.P2}
                            boardRightX={
                                this.state.boardBounds.x +
                                this.state.boardBounds.width
                            }
                            setUseAI={useAI =>
                                this.handleAIToggle(useAI, players.P2)
                            }
                        />
                    </div>
                    {this.renderPieces().concat(this.renderSpots())}
                </div>
            </>
        )
    }

    handleAIToggle(useAI, player) {
        const aiPlayerKey = player === players.P2 ? "p2AI" : "p1AI"

        this.setState(state => {
            return {
                [aiPlayerKey]: useAI,
                aiMovePending:
                    state.activePlayer === player || state.aiMovePending,
            }
        })
    }

    finishTurn(made3InARow = false) {
        const lastState = this.state.gameState

        let gameState
        if (made3InARow) {
            gameState = gameStates.DESTROY
        } else {
            gameState = this.allSidePiecesPlayed()
                ? gameStates.MOVE
                : gameStates.DROP
        }

        let announcement
        if (gameState === gameStates.DESTROY) {
            announcement = messages.seekPhase
        } else {
            announcement =
                gameState === gameStates.DROP
                    ? messages.dropPhase
                    : messages.movePhase
        }

        this.setState(
            state => {
                return {
                    gameState,
                    announcement,
                    aiMakingMove: false,
                }
            },
            () => {
                if (made3InARow) {
                    if (this.isAI(this.state.activePlayer)) {
                        this.setState({ aiMovePending: true })
                        console.log("made3InARow + AI-turn")
                    }
                } else {
                    const nextPlayer =
                        this.state.activePlayer === players.P1
                            ? players.P2
                            : players.P1
                    const nextPlayerIsAI = this.isAI(nextPlayer)

                    console.log(
                        "next player",
                        nextPlayer,
                        "; aiMovePending: ",
                        nextPlayerIsAI
                    )

                    this.setState({
                        // This is only here for dealing with AI turns
                        activePlayer: nextPlayer,
                        aiMovePending: nextPlayerIsAI,
                    })
                }
            }
        )

        this.handleStateTransition(lastState, gameState)
    }

    handleStateTransition(oldState, newState) {
        if (newState === gameStates.DESTROY) {
            document.getElementsByTagName("body")[0].style.cursor = "none"
            this.setState({ aiMovePending: true })
        } else {
            document.getElementsByTagName("body")[0].style.cursor = "default"
        }
    }

    allSidePiecesPlayed() {
        const allPlayed = Object.values(this.state.boardState.lSide)
            .concat(Object.values(this.state.boardState.rSide))
            .reduce(
                (allZeros, pieceState) => pieceState === 0 && allZeros,
                true
            )

        return allPlayed
    }

    piecePickedUp(id) {
        this.setState({
            pickedUpPiece: id,
        })
    }

    pieceDropped(pieceId) {
        this.setState({
            pickedUpPiece: null,
        })
        const { row, col } = this.state.selectedBoardPos
        let lastRow = -1
        let lastCol = -1

        if (this.state.gameState === gameStates.MOVE) {
            const oldLocation = this.findLocationWithPiece(pieceId)
            lastRow = oldLocation.row
            lastCol = oldLocation.col
        }

        if (
            this.isMoveLegal(
                row,
                col,
                this.state.activePlayer,
                lastRow,
                lastCol
            )
        ) {
            this.movePieceTo(row, col, pieceId, state => {
                this.finishTurn(
                    this.moveMakes3InARow(
                        row,
                        col,
                        this.state.activePlayer,
                        lastRow,
                        lastCol
                    )
                )
            })
        }
    }

    destroyPiece(pieceId) {
        const { row, col } = this.findLocationWithPiece(pieceId)

        console.log("DESTROYING", row, col)

        this.setSpotState(row, col, 0, false, this.state, sections.MAIN)
        this.finishTurn()
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
            this.state.boardState.main,
            this.state.boardState.lSide,
            this.state.boardState.rSide,
        ]
            .map(sectionState => {
                const resultKey = Object.keys(sectionState).find(
                    key => sectionState[key] === pieceId
                )

                return resultKey !== undefined
                    ? {
                          section: this.sectionStateToID(sectionState),
                          row: this.coordsFromKey(resultKey)[0],
                          col: this.coordsFromKey(resultKey)[1],
                      }
                    : null
            })
            .find(result => result !== null)
    }

    getLegalMoves(player, lastRow = -1, lastCol = -1) {
        return Object.keys(this.state.boardState.main)
            .map(key => this.coordsFromKey(key))
            .filter(coords => {
                const [row, col] = coords
                return this.isMoveLegal(row, col, player, lastRow, lastCol)
            })
    }

    isMoveLegal(row, col, player, lastRow, lastCol) {
        const pieceId = this.getSpotState(row, col)
        const spotIsOccupied = pieceId !== 0

        if (this.state.gameState === gameStates.DROP) {
            const makes3InARow = this.moveMakes3InARow(row, col, player)

            return !spotIsOccupied && !makes3InARow
        } else if (this.state.gameState === gameStates.MOVE) {
            return (
                !spotIsOccupied && this.areNeighbors(lastRow, lastCol, row, col)
            )
        } else if (this.state.gameState === gameStates.DESTROY) {
            return !this.pieceBelongsToActivePlayer(pieceId) && spotIsOccupied
        }
    }

    scoreCandidateMove(row, col, player, lastRow, lastCol) {
        if (this.state.gameState === gameStates.DROP) {
            return 1
        } else if (this.state.gameState === gameStates.MOVE) {
            return this.moveMakes3InARow(row, col, player, lastRow, lastCol)
                ? 1
                : 0
        } else if (this.state.gameState === gameStates.DESTROY) {
            return 1
        } else {
            return -5
        }
    }

    moveMakes3InARow(row, col, player, lastRow, lastCol) {
        const pieceAlreadyOnBoard = lastRow !== undefined
        const pieceId = pieceAlreadyOnBoard
            ? this.state.boardState.main[this.coordsToKey(lastRow, lastCol)]
            : -1

        // clear piece from its previous location
        if (pieceAlreadyOnBoard)
            this.state.boardState.main[this.coordsToKey(lastRow, lastCol)] = -1

        const chainLengths = [
            directions.UP,
            directions.DOWN,
            directions.LEFT,
            directions.RIGHT,
        ].map(direction =>
            this.chainLengthInDirection(player, row, col, direction)
        )

        // restore piece to its previous location
        if (pieceAlreadyOnBoard)
            this.state.boardState.main[this.coordsToKey(lastRow, lastCol)] =
                pieceId

        if (
            chainLengths[0] + chainLengths[1] > 1 ||
            chainLengths[2] + chainLengths[3] > 1
        ) {
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

        const neighborRow = row + rowAdder
        const neighborCol = col + colAdder
        return {
            row: neighborRow,
            col: neighborCol,
            state: this.getSpotState(neighborRow, neighborCol),
        }
    }

    areNeighbors(row1, col1, row2, col2) {
        return Math.abs(row1 - row2) + Math.abs(col1 - col2) === 1
    }

    getSpotState(row, col, section = sections.MAIN) {
        switch (section) {
            case sections.MAIN:
                return this.state.boardState.main[row + "," + col]
            case sections.LEFT:
                return this.state.boardState.lSide[row + "," + col]
            case sections.RIGHT:
                return this.state.boardState.rSide[row + "," + col]
        }
    }

    setSpotState(
        row,
        col,
        spotState,
        defer = false,
        lastState = this.state,
        section = sections.MAIN
    ) {
        const newStateFunc = state => {
            const boardState = state.boardState
            let newState

            switch (section) {
                case sections.MAIN:
                    newState = {
                        ...boardState,
                        main: {
                            ...boardState.main,
                            [row + "," + col]: spotState,
                        },
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
        }

        if (defer) {
            return newStateFunc(lastState)
        } else {
            this.setState(newStateFunc)
        }
    }

    renderPieces() {
        const pieces = {}

        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 6; j++) {
                const id = this.getSpotState(i, j, sections.MAIN)
                pieces[id] = this.renderPieceAtSlot(i, j, sections.MAIN)
            }
        }

        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 2; j++) {
                const leftId = this.getSpotState(i, j, sections.LEFT)
                const rightId = this.getSpotState(i, j, sections.RIGHT)

                pieces[leftId] = this.renderPieceAtSlot(i, j, sections.LEFT)
                pieces[rightId] = this.renderPieceAtSlot(i, j, sections.RIGHT)
            }
        }

        const copy = Object.keys(pieces).slice()

        // I am not clear on why it's necessary to sort the pieces in this way,
        // but I can say it resolves an animation bug (piece would jump immediately
        // to its destination instead of animating)
        //
        // I've noticed since originally writing this that the bug is resolved even if
        // we skip sorting here. However, I'm keeping it because I believe the issue is related
        // to order and when we skip sorting the current order happens to work but it's unknown why.
        copy.sort((a, b) => a - b)

        return copy.map(key => pieces[key])
    }

    renderSpots() {
        const spots = []
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 6; j++) {
                const { x, y } = this.getSpotPos(i, j, sections.MAIN)
                const margin = this.state.spotSize * 0.15
                const transformString = `translate(${x + margin / 2}px, ${
                    y + margin / 2
                }px)`

                let bgColor = "#222"
                let filterStr = ""
                let border = "none"

                if (this.state.pickedUpPiece) {
                    const location = this.findLocationWithPiece(
                        this.state.pickedUpPiece
                    )
                    const legal = this.isMoveLegal(
                        i,
                        j,
                        this.state.activePlayer,
                        location.row,
                        location.col
                    )

                    if (
                        i === this.state.selectedBoardPos.row &&
                        j === this.state.selectedBoardPos.col
                    ) {
                        filterStr = this.state.effects
                            ? `drop-shadow(0px 0px 0.75rem ${
                                  legal ? "#0f9" : "#f01"
                              })`
                            : ""
                        bgColor = "#4e504e"
                    } else if (this.getSpotState(i, j) === 0) {
                        if (legal) {
                            border = "1px solid #258542"
                        } else {
                            border = "2px solid #af2121"
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
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            transition: "border 200ms ease-out",
                            border,
                        }}
                    >
                        {showDebugState && (
                            <span
                                style={{
                                    color: "white",
                                    fontSize: "1rem",
                                    zIndex: 12,
                                }}
                            >
                                {this.getSpotState(i, j)}
                            </span>
                        )}
                    </div>
                )
            }
        }

        return spots
    }

    renderPieceAtSlot(row, col, section) {
        let spotState = this.getSpotState(row, col, section)

        if (spotState === 0) return null
        else {
            const id = spotState
            const pos = this.getSpotPos(row, col, section)

            const pieceMargin = this.state.spotSize * 0.25
            const pieceSize = this.state.spotSize - pieceMargin

            pos.x += pieceMargin / 2
            pos.y += pieceMargin / 2

            return (
                <Piece
                    key={id}
                    id={id}
                    gameState={this.state.gameState}
                    pos={pos}
                    size={pieceSize}
                    x
                    boardPos={this.state.boardBounds}
                    pieceDroppedFunc={this.pieceDropped.bind(this)}
                    piecePickedUpFunc={this.piecePickedUp.bind(this)}
                    pieceDraggedFunc={this.pieceDragged.bind(this)}
                    pieceCanBeLifted={this.pieceCanBeLifted.bind(this)}
                    destroyPiece={this.destroyPiece.bind(this)}
                    destroyable={
                        this.state.gameState === gameStates.DESTROY &&
                        !this.pieceBelongsToActivePlayer(id)
                    }
                    hidden={
                        this.state.gameState === gameStates.DESTROY &&
                        this.pieceBelongsToActivePlayer(id)
                    }
                    drawAIHand={
                        this.state.aiSelection.row === row &&
                        this.state.aiSelection.col === col &&
                        this.state.aiMakingMove &&
                        section === sections.MAIN // This is going to be an issue for showing the AI hand over side pieces before moving
                    }
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
        } else if (this.state.gameState === gameStates.MOVE) {
            return this.pieceBelongsToActivePlayer(id)
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
        return Object.values(this.state.boardState.main).includes(id)
    }

    getSpotPos(row, col, section) {
        switch (section) {
            case sections.MAIN:
                return this.getMainSpotPos(row, col)
            case sections.LEFT:
                return this.getSideSpotPos(true, row, col)
            case sections.RIGHT:
                return this.getSideSpotPos(false, row, col)
            default:
                throw "unknown section: " + section
        }
    }

    getMainSpotPos(row, col) {
        const spotSize = this.state.spotSize
        const x = this.state.centerStartX
        const y = this.state.spotSize / 2

        return {
            x: x + col * spotSize,
            y: y + row * spotSize,
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

    getEmptyBoard() {
        const board = { main: {}, lSide: {}, rSide: {} }
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 6; j++) {
                board.main[i + "," + j] = 0
            }
        }

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
