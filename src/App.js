import React, { Component } from 'react';
import Dante from './editor/components/Dante/Dante';
import './App.css';

class App extends Component {
  render() {
    return (
      <div style={{padding : '20%' }}>
        
          <Dante widgets={[]} />

      </div>
    );
  }
}

export default App;
