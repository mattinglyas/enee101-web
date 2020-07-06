console.log('Client-side code running');

const moveButton = document.getElementById('moveButton');
const xInput = document.getElementById('xInput');
const yInput = document.getElementById('yInput');
const listOfDevices = document.getElementById('listOfDevices');

moveButton.addEventListener('click', function(e) {
    console.log('button was clicked');

    var targetDevice = listOfDevices[listOfDevices.selectedIndex].text;
    var data = 
    { 
        target: targetDevice, 
        methodName: "move",
        responseTimeoutInSeconds: 200,
        payload: {
            x: xInput.value,
            y: yInput.value
        }
    };

    fetch('/method', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    })
    .then(function(response) {
        if (response.ok) {
            console.log('Click was recorded on server');
            return;
        }
        throw new Error('Request failed.');
    })
    .catch (function(error) {
        console.log(error);
    });
});