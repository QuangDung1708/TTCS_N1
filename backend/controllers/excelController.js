const ExcelJS = require('exceljs');

// 1. Controller tải file Excel mẫu
const downloadTemplate = async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Danh sách mẫu');

        // Định nghĩa cột
        worksheet.columns = [
            { header: 'STT', key: 'stt', width: 10 },
            { header: 'Họ và tên', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Số điện thoại', key: 'phone', width: 15 }
        ];

        // Thêm dòng dữ liệu mẫu
        worksheet.addRow({ stt: 1, name: 'Nguyễn Văn A', email: 'nguyenvana@example.com', phone: '0901234567' });

        // Thiết lập Header trả về file Excel
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=file_mau.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Lỗi download template:', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi tải file mẫu' });
    }
};

// 2. Controller parse (đọc) file Excel tải lên
const parseExcelUpload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng tải lên 1 file Excel!' });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.getWorksheet(1);

        const data = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            // Bỏ qua dòng tiêu đề (rowNumber === 1)
            if (rowNumber > 1) {
                data.push({
                    stt: row.getCell(1).value,
                    name: row.getCell(2).value,
                    email: row.getCell(3).value,
                    phone: row.getCell(4).value
                });
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Đọc dữ liệu Excel thành công',
            totalRows: data.length,
            data
        });
    } catch (error) {
        console.error('Lỗi parse file Excel:', error);
        return res.status(500).json({ success: false, message: 'Lỗi xử lý file Excel' });
    }
};

module.exports = {
    downloadTemplate,
    parseExcelUpload
};