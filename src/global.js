const mousePos = { x: 0, y: 0 }
const gameStates = {
    DROP: 0,
    MOVE: 1,
    DESTROY: 2,
}

const sections = {
    MAIN: "main",
    LEFT: "lSide",
    RIGHT: "rSide",
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
    destroyPhase: "Seek and destroy!",
}

export { mousePos, gameStates, sections, players, directions, messages }
