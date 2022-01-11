import Game from "./components/Game"
import "./style.scss"
import React from "react"
import ReactDOM from "react-dom"

ReactDOM.render(<Game />, document.getElementById("app"))

module.hot.accept()
