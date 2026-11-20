import {Component} from 'react';

// If a screen throws, show what happened and a way out instead of a blank page.
export default class Crash extends Component {
  state = {error: null};
  static getDerivedStateFromError(error) {
    return {error};
  }
  render() {
    const {error} = this.state;
    if (!error) return this.props.children;
    return (
      <main className="center-page" role="alert">
        <div className="form">
          <h1>Something went wrong</h1>
          <p className="muted" style={{margin: 0}}>FreshRoute hit an error on this screen. Your planned route and any drive in progress are saved on this device.</p>
          <pre style={{whiteSpace: 'pre-wrap', fontSize: 'var(--fs-sub)', color: 'var(--fr-text-2)', margin: 0}}>{String(error?.message || error)}</pre>
          <div className="row wrap">
            <button className="btn primary" onClick={() => location.reload()}>Reload</button>
            <button className="btn" onClick={() => (location.href = '/')}>Start screen</button>
          </div>
        </div>
      </main>
    );
  }
}
