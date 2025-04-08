document.getElementById('startButton').addEventListener('click', function() {
    const messageElement = document.getElementById('message');
    messageElement.textContent = 'Started...';
    
    setTimeout(() => {
        messageElement.textContent = '';
    }, 5000);
}); 