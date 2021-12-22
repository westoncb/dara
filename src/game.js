import React from "react"
import Board from "./board"

class Game extends React.Component {
    constructor(props) {
        super(props)
        this.reset()
    }

    render() {
        return (
            <ErrorBoundary>
                <Board></Board>
            </ErrorBoundary>
        )
    }

    reset() {}
}

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { error: null, errorInfo: null }
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        this.setState({ errorInfo, error })
    }

    render() {
        if (this.state.errorInfo) {
            // You can render any custom fallback UI
            return (
                <div className="error-boundary">
                    <h1>Something went wrong.</h1>
                    <div>{this.state.error?.toString()}</div>
                    <div>{this.state.errorInfo.componentStack}</div>
                </div>
            )
        }

        return this.props.children
    }
}

export default Game
