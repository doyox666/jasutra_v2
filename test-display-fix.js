// Test script to verify display works
// Run this in browser console on display.html page

async function testCompletedDisplay() {
    console.log('Testing completed display...');
    
    // Fetch data
    const response = await fetch('/api/queue/active');
    const data = await response.json();
    console.log('Fetched data:', data);
    
    // Check completed items
    const cuciCompleted = data.cuci.filter(v => v.status === 'completed');
    console.log(`Found ${cuciCompleted.length} completed cuci items:`, cuciCompleted);
    
    // Check if container exists
    const container = document.getElementById('cuci-completed');
    console.log('Container element:', container);
    
    if (!container) {
        console.error('ERROR: cuci-completed container not found!');
        return;
    }
    
    // Clear container
    container.innerHTML = '';
    
    // Add items manually
    cuciCompleted.forEach(vehicle => {
        const item = document.createElement('div');
        item.className = 'queue-item';
        item.setAttribute('data-status', 'completed');
        
        const time = new Date(vehicle.created_at).toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        item.innerHTML = `
            <div class="queue-number">${vehicle.queue_number}</div>
            <div class="queue-details">
                <div class="plate-number">${vehicle.plate_number}</div>
                <div class="queue-time">Masuk: ${time}</div>
            </div>
        `;
        
        container.appendChild(item);
        console.log(`Added ${vehicle.queue_number} to completed column`);
    });
    
    if (cuciCompleted.length === 0) {
        container.innerHTML = '<div class="empty-state">Tidak ada antrian</div>';
    }
    
    console.log('Test complete. Check the SELESAI column now.');
}

// Run the test
testCompletedDisplay();