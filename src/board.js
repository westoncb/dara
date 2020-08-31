import React from "react"
import debounce from 'lodash.debounce'
import Announcer from "./Announcer"

const sections = {MAIN: 0, LEFT: 1, RIGHT: 2}

const messages = {gameStart: "Game Start!", dropPhase: "Drop phase", movePhase: "Move phase"}

class Board extends React.Component {

    constructor(props) {
        super(props)

        this.state = { boardWidth: 1, boardHeight: 1, centerStartX: 1, centerEndX: 1, spotSize: 1, announcement: ""}
        this.boardRef = React.createRef()
    }

    componentDidMount() {
        const resizeFunc = () => {
            const { width, height, centerStartX, centerEndX, centerGap } = this.getBoardDimensions()

            this.setState({ 
                boardWidth: width,
                boardHeight: height,
                centerStartX,
                centerEndX,
                spotSize: height / 6,
                centerGap })
        }
        window.onresize = debounce(resizeFunc, 60)

        resizeFunc()

        this.setState({announcement: messages.gameStart})

        setTimeout(() => {
            this.setState({ announcement: messages.dropPhase })
        }, 1750)
    }

    getBoardDimensions() {
        const app = document.getElementById("app")

        // (vertical_pieces / horizontal_pieces) - 2.5% of width gap size between center and each side area
        const aspectRatio = (6 / (6 + 4)) - 0.05

        const width = app.offsetWidth * 0.85
        const noGapWidth = app.offsetWidth * 0.8
        const height = width * aspectRatio
        const gap = (width - noGapWidth) / 2


        const centerStartX = noGapWidth * (2 / 10) + gap
        const centerEndX = centerStartX + noGapWidth * (6 / 10)

        return {width, height, centerStartX, centerEndX, centerGap: gap}
    }

    render() {
        const {width, height} = this.getBoardDimensions()
        const announcementXPos = this.boardRef.current ? this.boardRef.current.offsetWidth / 2 : 0

        return (
            <div ref={this.boardRef} id="board" style={{width: width+"px", height: height+"px"}}>
                <Announcer text={this.state.announcement} xPos={announcementXPos} swipeOut={this.state.announcement === messages.gameStart}/>
                {this.renderPieces(this.props.boardState).concat(this.renderSpots())}
            </div>
        )
    }

    renderPieces(boardState) {
        const pieces = []

        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 6; j++) {
                pieces.push(this.renderPieceAtSlot(i, j, sections.main, boardState))
            }
        }

        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 2; j++) {
                pieces.push(this.renderPieceAtSlot(i, j, sections.LEFT, boardState))
                pieces.push(this.renderPieceAtSlot(i, j, sections.RIGHT, boardState))
            }
        }

        return pieces
    }

    renderSpots() {
        const spots = []
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 6; j++) {
                const { x, y } = this.getSpotPos(i, j)
                const transformString = `translate(${x}px, ${y}px)`
                spots.push((<div 
                                key={i+","+j+"_spot"}
                                className="spot"
                                style={{transform: transformString, width: this.state.spotSize, height: this.state.spotSize}}
                            ></div>))
            }
        }

        return spots
    }

    renderPieceAtSlot(row, col, section, boardState) {
        let id = 0

        switch (section) {
            case sections.MAIN:
                id = boardState[row + "," + col]
                break;
            case sections.LEFT:
                id = boardState.lSide[row + "," + col]
                break;
            case sections.RIGHT:
                id = boardState.rSide[row + "," + col]
                break;
        }

        if (id === 0)
            return null
        else {
            let pos
            switch (section) {
                case sections.MAIN:
                    pos = this.getSpotPos(row, col)
                    break;
                case sections.LEFT:
                    pos = this.getSideSpotPos(true, row, col)
                    break;
                case sections.RIGHT:
                    pos = this.getSideSpotPos(false, row, col)
                    break;
            }

            const pieceMargin = this.state.spotSize * 0.25
            const pieceSize = this.state.spotSize - pieceMargin
            const transformString = `translate(${pos.x + pieceMargin/2}px, ${pos.y + pieceMargin/2}px)`

            return (
                <div key={id} className={"piece piece-add" + (id > 12 ? " piece-p2" : "")}
                    style={{ width: pieceSize+"px", height: pieceSize+"px", transform: transformString }}>|||</div>
            )
        }
    }

    getSpotPos(row, col) {
        const spotSize = this.state.spotSize
        const x = this.state.centerStartX
        const y = this.state.spotSize/2

        return { x: (x + col * spotSize), y: (y + row * spotSize) }
    }

    getSideSpotPos(leftSide, row, col) {
        const spotSize = this.state.spotSize
        const x = leftSide ? 0 : this.state.centerEndX + this.state.centerGap
        const y = 0

        return { x: (x + col * spotSize), y: (y + row * spotSize) }
    }
}

export default Board