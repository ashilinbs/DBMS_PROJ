const form = document.getElementById('orderForm');
const messageDiv = document.getElementById('message');

form.addEventListener('submit', async function(event) {
    event.preventDefault();

    const formData = new FormData(form);
    const requestBody = Object.fromEntries(formData);

    try {
        fetch('http://localhost:5760/api/orders/place_order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'your_username',
                password: 'your_password',
                product_name: 'product_name',
                quantity: 4,
            }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Success:', data);
        })
        .catch(error => {
            console.error('Error:', error);
        });
        

    } catch (error) {
        console.error('Error placing order:', error);
        messageDiv.textContent = `Error placing order: ${error.message}`;
    }
});
