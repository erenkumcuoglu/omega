import React from 'react'

const AppTest2 = () => {
  return React.createElement('div', {
    style: { padding: '20px', backgroundColor: 'blue' }
  }, [
    React.createElement('h1', { 
      key: '1',
      style: { color: 'white', fontSize: '48px' }
    }, 'REACT TEST'),
    React.createElement('p', { 
      key: '2',
      style: { fontSize: '24px' }
    }, 'React.createElement ile test')
  ])
}

export default AppTest2
