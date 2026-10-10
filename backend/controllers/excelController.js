const ExcelJS = require('exceljs');

const downloadTemplate = async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Danh sách mẫu');
        worksheet.columns = [
            { header: 'STT', key: 'stt', width: 10 },
            { header: 'Họ và tên', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Số điện thoại', key: 'phone', width: 15 }
        ];
        worksheet.addRow({ stt: 1, name: 'Nguyễn Văn A', email: 'nguyenvana@example.com', phone: '0901234567' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=file_mau.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

const parseExcelUpload = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Chưa có file!' });
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.getWorksheet(1);
        const data = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber > 1) {
                data.push({ 
                    stt: row.getCell(1).value, 
                    name: row.getCell(2).value, 
                    email: row.getCell(3).value, 
                    phone: row.getCell(4).value 
                });
            }
        });
        res.status(200).json({ success: true, totalRows: data.length, data });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi parse file' });
    }
};

module.exports = { downloadTemplate, parseExcelUpload };