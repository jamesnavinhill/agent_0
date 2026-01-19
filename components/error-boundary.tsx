"use client"

import React, { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
    children: ReactNode
    fallback?: ReactNode
    onError?: (error: Error, errorInfo: ErrorInfo) => void
    /** Name of the component/panel for error reporting */
    name?: string
}

interface State {
    hasError: boolean
    error: Error | null
    errorInfo: ErrorInfo | null
}

/**
 * React Error Boundary component for graceful error handling.
 * Catches JavaScript errors anywhere in child component tree.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo })

        // Log error for debugging
        console.error(`[ErrorBoundary${this.props.name ? `: ${this.props.name}` : ""}]`, error, errorInfo)

        // Call optional error callback
        this.props.onError?.(error, errorInfo)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null })
    }

    render() {
        if (this.state.hasError) {
            // Custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback
            }

            // Default error UI
            return (
                <div className="flex items-center justify-center p-4 h-full min-h-[200px]">
                    <Card className="max-w-md w-full border-destructive/50 bg-destructive/5">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                <CardTitle className="text-base">Something went wrong</CardTitle>
                            </div>
                            <CardDescription>
                                {this.props.name ? `Error in ${this.props.name}` : "An unexpected error occurred"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {this.state.error && (
                                <div className="text-xs font-mono bg-muted p-2 rounded overflow-auto max-h-24">
                                    {this.state.error.message}
                                </div>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={this.handleReset}
                                className="w-full"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Try Again
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )
        }

        return this.props.children
    }
}

/**
 * HOC to wrap a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    name?: string
) {
    return function ErrorBoundaryWrapper(props: P) {
        return (
            <ErrorBoundary name={name}>
                <WrappedComponent {...props} />
            </ErrorBoundary>
        )
    }
}

/**
 * Panel-specific error boundary with compact styling
 */
export function PanelErrorBoundary({
    children,
    name
}: {
    children: ReactNode
    name: string
}) {
    return (
        <ErrorBoundary
            name={name}
            fallback={
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <AlertTriangle className="h-8 w-8 text-destructive mb-3" />
                    <p className="text-sm font-medium mb-1">Failed to load {name}</p>
                    <p className="text-xs text-muted-foreground mb-4">
                        Please try refreshing the page
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.reload()}
                    >
                        <RefreshCw className="h-3 w-3 mr-2" />
                        Refresh
                    </Button>
                </div>
            }
        >
            {children}
        </ErrorBoundary>
    )
}
