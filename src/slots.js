const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

// Пример данных о бронировании
const bookings = [
    { 'room_id': 1, 'date': '2024-03-30', 'start_time': '08:00', 'end_time': '08:30' },
    { 'room_id': 2, 'date': '2024-03-30', 'stastart_timert': '09:00', 'end_time': '11:00' },
    { 'room_id': 3, 'date': '2024-03-30', 'start_time': '10:00', 'end_time': '12:00' },
    { 'room_id': 4, 'date': '2024-03-30', 'start_time': '13:00', 'end_time': '15:00' },
    { 'room_id': 5, 'date': '2024-03-30', 'start_time': '14:00', 'end_time': '16:00' }
];

// Создаем холст
const canvasWidth = 850; // Увеличили ширину для столбца времени
const canvasHeight = 400;
const canvas = createCanvas(canvasWidth, canvasHeight);
const ctx = canvas.getContext('2d');
ctx.fillStyle = 'white';
ctx.fillRect(0, 0, canvasWidth, canvasHeight);

// Рисуем шкалу времени слева
ctx.fillStyle = 'black';
ctx.font = '14px Arial';
for (let hour = 0; hour <= 24; hour += 1) {
    const y = (hour / 24) * canvasHeight + 9;
    ctx.fillText(`${hour.toString().padStart(2, '0')}:00`, 5, y + 5);
}

// Рисуем сетку
ctx.strokeStyle = 'gray';
ctx.lineWidth = 2;
for (let room = 0; room < 5; room++) {
    const x = room * ((canvasWidth - 50) / 5); // Изменили делитель для столбцов
    ctx.beginPath();
    ctx.moveTo(x + 50, 0);
    ctx.lineTo(x + 50, canvasHeight);
    ctx.stroke();
}

for (let hour = 0; hour <= 24; hour++) {
    const y = (hour / 24) * canvasHeight;
    ctx.beginPath();
    ctx.moveTo(0, y); // Изменили x координату для столбца времени
    ctx.lineTo(canvasWidth,  y);
    ctx.stroke();
}

// Рисуем занятые ячейки в красном цвете
ctx.fillStyle = 'red';
for (const booking of bookings) {
    const room = booking.room;
    const [startHour, startMinute] = booking.start.split(':').map(Number);
    const [endHour, endMinute] = booking.end.split(':').map(Number);
    const start_y = ((startHour * 60 + startMinute) / (24 * 60)) * canvasHeight;
    const end_y = ((endHour * 60 + endMinute) / (24 * 60)) * canvasHeight;
    ctx.fillRect((room - 1) * ((canvasWidth - 50) / 5) + 50, start_y, (canvasWidth - 50) / 5, end_y - start_y);
}

// Сохраняем изображение
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('booking_schedule_with_time_column.png', buffer);
