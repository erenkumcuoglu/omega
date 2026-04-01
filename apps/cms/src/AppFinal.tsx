import React from 'react'

function AppFinal() {
  return React.createElement('div', {
    style: { 
      padding: '30px', 
      backgroundColor: '#1a1a1a',
      color: 'white',
      fontSize: '32px',
      fontWeight: 'bold',
      textAlign: 'center'
    }
  }, [
    React.createElement('h1', { key: '1' }, '✅ FRONTEND ÇALIŞIYOR!'),
    React.createElement('p', { key: '2', style: { fontSize: '18px', marginTop: '20px' } }, 'Vite React render başarılı!'),
    React.createElement('button', { 
      key: '3',
      style: { 
        padding: '10px 20px', 
        backgroundColor: '#4CAF50', 
        color: 'white', 
        border: 'none', 
        borderRadius: '5px',
        fontSize: '16px',
        cursor: 'pointer',
        marginTop: '20px'
      },
      onClick: () => alert('Button çalışıyor!')
    }, 'Test Button')
  ])
}

export default AppFinal
