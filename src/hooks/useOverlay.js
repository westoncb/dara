import isNil from "lodash.isnil"
import React, { useState, useRef, useMemo } from "react"
import { useEffect } from "react/cjs/react.development"
import { useStore } from "../store"

let lastFrameTime = performance.now()

function useOverlay() {
    const { overlayElement } = useStore()
    const subscribers = useRef({})

    useEffect(() => {
        if (isNil(overlayElement)) return

        const ctx = overlayElement.getContext("2d")
        const loop = time => {
            ctx.clearRect(0, 0, overlayElement.width, overlayElement.height)

            const delta = time - lastFrameTime
            const deltaSeconds = delta / 1000
            lastFrameTime = time

            Object.values(subscribers.current).forEach(s => {
                s(ctx, deltaSeconds)
            })
            window.requestAnimationFrame(loop)
        }

        overlayElement.width = overlayElement.offsetWidth
        overlayElement.height = overlayElement.offsetHeight

        window.requestAnimationFrame(loop)
    }, [overlayElement])

    const funcs = useMemo(() => {
        return {
            unsubscribe: id => {
                delete subscribers.current[id]
            },
            subscribe: (id, func) => {
                subscribers.current[id] = func
            },
        }
    }, [])

    return funcs
}

export default useOverlay
