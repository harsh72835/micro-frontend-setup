// Async boundary — required for Module Federation shared singletons.
// Without this, eager shared deps (react, react-dom) fail to initialise.
import('./bootstrap');
