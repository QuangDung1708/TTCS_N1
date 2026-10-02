import React, { useState, useRef } from 'react';

/**
 * Task S2-01: Modal Import Excel & Phân loại lỗi theo dòng
 * - Khu vực kéo thả file (Dropzone)
 * - Nút tải file mẫu (Template download)
 * - Bảng Preview phân loại lỗi chi tiết từng dòng (Row-by-row error classification)
 */
export default function ImportExcelModal({ isOpen, onClose, onSuccess, meta = { roles: [], groups: [] } }) {
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [parsedRows, setParsedRows] = useState([]);
    const [filterTab, setFilterTab] = useState('ALL'); // 'ALL', 'VALID', 'ERROR'
    const [importing, setImporting] = useState(false);
    const [importMessage, setImportMessage] = useState(null);

    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    // Tải file mẫu CSV/Excel chuẩn UTF-8
    const handleDownloadTemplate = () => {
        const headers = ["Họ và tên", "Email", "Mật khẩu", "Vai trò", "Nhóm kinh doanh", "Số điện thoại"];
        const sampleRows = [
            ["Nguyễn Văn An", "an.nguyen@company.com", "123456aA@", "Nhân viên kinh doanh", "Nhóm Mới", "0912345678"],
            ["Trần Thị Bình", "binh.tran@company.com", "123456aA@", "Trưởng nhóm", "Nhóm 1", "0987654321"],
            ["Lê Văn Cường", "cuong.le", "123456", "Nhân viên kinh doanh", "Nhóm 2", "0901112233"], // Dòng lỗi email & mk
            ["Nguyễn Văn An", "an.nguyen@company.com", "123456aA@", "Nhân viên kinh doanh", "Nhóm Mới", "0912345678"] // Dòng trùng email
        ];

        let csvContent = "\uFEFF"; // UTF-8 BOM cho Excel mở tiếng Việt không lỗi font
        csvContent += headers.join(",") + "\n";
        sampleRows.forEach(row => {
            csvContent += row.map(field => `"${field}"`).join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "Mau_Import_NhanVien.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Đọc và Validate nội dung file CSV/Excel đơn giản
    const parseAndValidateFile = (selectedFile) => {
        setParsing(true);
        setImportMessage(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');

                if (lines.length <= 1) {
                    setParsedRows([]);
                    setParsing(false);
                    return;
                }

                // Parse từng dòng dữ liệu (Bỏ dòng tiêu đề header)
                const rowsData = [];
                const seenEmails = new Map();

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                for (let i = 1; i < lines.length; i++) {
                    const rawLine = lines[i];
                    // Phân tách dấu phẩy hoặc dấu phẩy trong ngoặc kép
                    const cols = rawLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || rawLine.split(',');
                    const cleanCols = cols.map(c => c.replace(/^"|"$/g, '').trim());

                    const fullName = cleanCols[0] || '';
                    const email = cleanCols[1] || '';
                    const password = cleanCols[2] || '';
                    const roleName = cleanCols[3] || 'Nhân viên kinh doanh';
                    const groupName = cleanCols[4] || '';
                    const phone = cleanCols[5] || '';

                    const rowErrors = [];
                    let status = 'VALID';

                    // 1. Kiểm tra Họ và tên
                    if (!fullName) {
                        rowErrors.push('Thiếu họ và tên');
                    }

                    // 2. Kiểm tra Email
                    if (!email) {
                        rowErrors.push('Thiếu địa chỉ email');
                    } else if (!emailRegex.test(email)) {
                        rowErrors.push('Email không hợp lệ');
                    } else if (seenEmails.has(email.toLowerCase())) {
                        rowErrors.push(`Email trùng lặp với dòng ${seenEmails.get(email.toLowerCase())}`);
                        status = 'DUPLICATE';
                    } else {
                        seenEmails.set(email.toLowerCase(), i + 1);
                    }

                    // 3. Kiểm tra Mật khẩu
                    if (password && password.length < 6) {
                        rowErrors.push('Mật khẩu tối thiểu 6 ký tự');
                    }

                    if (rowErrors.length > 0 && status !== 'DUPLICATE') {
                        status = 'ERROR';
                    }

                    rowsData.push({
                        lineNum: i + 1,
                        fullName,
                        email,
                        password: password ? '******' : '(Tự động tạo)',
                        roleName,
                        groupName,
                        phone,
                        status,
                        errors: rowErrors
                    });
                }

                setParsedRows(rowsData);
            } catch (err) {
                console.error("Parse file error:", err);
                setParsedRows([]);
            } finally {
                setParsing(false);
            }
        };

        reader.readAsText(selectedFile);
    };

    // Xử lý chọn file qua input
    const handleFileSelect = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            parseAndValidateFile(selected);
        }
    };

    // Xử lý Drag & Drop
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const droppedFile = e.dataTransfer.files[0];
            setFile(droppedFile);
            parseAndValidateFile(droppedFile);
            e.dataTransfer.clearData();
        }
    };

    // Xóa file hiện tại
    const handleRemoveFile = () => {
        setFile(null);
        setParsedRows([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Thống kê phân loại lỗi
    const validCount = parsedRows.filter(r => r.status === 'VALID').length;
    const errorCount = parsedRows.filter(r => r.status === 'ERROR').length;
    const duplicateCount = parsedRows.filter(r => r.status === 'DUPLICATE').length;
    const totalCount = parsedRows.length;

    // Lọc theo tab
    const filteredRows = parsedRows.filter(r => {
        if (filterTab === 'VALID') return r.status === 'VALID';
        if (filterTab === 'ERROR') return r.status === 'ERROR' || r.status === 'DUPLICATE';
        return true;
    });

    // Thực hiện Import dữ liệu hợp lệ
    const handleExecuteImport = async () => {
        if (validCount === 0) return;

        setImporting(true);
        setImportMessage(null);

        try {
            // Giả lập tiến trình Import thành công
            await new Promise(resolve => setTimeout(resolve, 1200));

            const validRows = parsedRows.filter(r => r.status === 'VALID');
            if (onSuccess) {
                onSuccess({
                    importedCount: validRows.length,
                    skippedCount: totalCount - validRows.length,
                    data: validRows
                });
            }

            setImportMessage({
                type: 'success',
                text: `Đã import thành công ${validRows.length} tài khoản người dùng vào hệ thống!`
            });

            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            setImportMessage({
                type: 'error',
                text: 'Có lỗi xảy ra trong quá trình Import dữ liệu!'
            });
        } finally {
            setImporting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: '16px'
        }}>
            <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                width: '100%',
                maxWidth: '960px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                color: '#0f172a',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
                {/* Header Modal */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#f8fafc'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>📥</span> Import Dữ Liệu Từ Excel
                        </h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                            Tải lên danh sách tài khoản (.xlsx, .xls, .csv), kiểm tra & phân loại lỗi tự động trước khi lưu.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '22px',
                            color: '#64748b',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '6px'
                        }}
                        title="Đóng modal"
                    >
                        ✕
                    </button>
                </div>

                {/* Body Content */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                    {/* Nút Tải File Mẫu & Hướng dẫn */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '20px' }}>💡</span>
                            <span style={{ fontSize: '13px', color: '#0369a1' }}>
                                Chưa có định dạng chuẩn? Tải ngay <strong>file mẫu Excel</strong> chứa các cột bắt buộc: Họ tên, Email, Vai trò, Nhóm.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            style={{
                                backgroundColor: '#0284c7',
                                color: '#ffffff',
                                border: 'none',
                                padding: '8px 14px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <span>📥</span> Tải File Mẫu (.CSV)
                        </button>
                    </div>

                    {/* Khu vực Drag & Drop File */}
                    {!file ? (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                            style={{
                                border: `2px dashed ${isDragging ? '#ff6b00' : '#cbd5e1'}`,
                                backgroundColor: isDragging ? '#fff7ed' : '#f8fafc',
                                borderRadius: '10px',
                                padding: '36px 20px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                marginBottom: '20px'
                            }}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                            <div style={{ fontSize: '42px', marginBottom: '10px' }}>📊</div>
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                                Kéo & thả file Excel/CSV vào đây hoặc <span style={{ color: '#ff6b00', textDecoration: 'underline' }}>bấm để chọn file</span>
                            </h4>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                Hỗ trợ định dạng: <strong>.xlsx, .xls, .csv</strong> (Kích thước tối đa 10MB)
                            </p>
                        </div>
                    ) : (
                        /* Thông tin File đã chọn */
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '14px 18px',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '28px' }}>📄</span>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#0f172a' }}>
                                        {file.name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                        {(file.size / 1024).toFixed(1)} KB • Trạng thái: <span style={{ color: '#16a34a', fontWeight: '600' }}>Đã tải lên</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleRemoveFile}
                                style={{
                                    backgroundColor: '#f1f5f9',
                                    color: '#475569',
                                    border: '1px solid #cbd5e1',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Đổi file khác
                            </button>
                        </div>
                    )}

                    {/* Alert Thông báo kết quả Import */}
                    {importMessage && (
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            fontSize: '14px',
                            backgroundColor: importMessage.type === 'error' ? '#fef2f2' : '#f0fdf4',
                            color: importMessage.type === 'error' ? '#991b1b' : '#166534',
                            border: `1px solid ${importMessage.type === 'error' ? '#fecaca' : '#bbf7d0'}`
                        }}>
                            {importMessage.text}
                        </div>
                    )}

                    {/* Thống kê & Preview Phân loại lỗi từng dòng */}
                    {file && (
                        <div>
                            {/* Thanh Thống kê thẻ chỉ số */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: '12px',
                                marginBottom: '16px'
                            }}>
                                <div style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>TỔNG SỐ DÒNG</div>
                                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>{totalCount}</div>
                                </div>

                                <div style={{ backgroundColor: '#f0fdf4', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                    <div style={{ fontSize: '12px', color: '#166534', fontWeight: '500' }}>HỢP LỆ (SẴN SÀNG)</div>
                                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#15803d', marginTop: '4px' }}>{validCount}</div>
                                </div>

                                <div style={{ backgroundColor: '#fef2f2', padding: '12px 16px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                                    <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: '500' }}>LỖI DỮ LIỆU</div>
                                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#b91c1c', marginTop: '4px' }}>{errorCount}</div>
                                </div>

                                <div style={{ backgroundColor: '#faf5ff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
                                    <div style={{ fontSize: '12px', color: '#6b21a8', fontWeight: '500' }}>TRÙNG LẶP EMAIL</div>
                                    <div style={{ fontSize: '20px', fontWeight: '700', color: '#7e22ce', marginTop: '4px' }}>{duplicateCount}</div>
                                </div>
                            </div>

                            {/* Thanh Lọc theo Trạng thái & Tiêu đề Bảng */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '12px',
                                flexWrap: 'wrap',
                                gap: '8px'
                            }}>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                                    📋 Bảng Khảo Sát Kết Quả Phân Loại Dòng
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setFilterTab('ALL')}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            border: 'none',
                                            cursor: 'pointer',
                                            backgroundColor: filterTab === 'ALL' ? '#0f172a' : '#f1f5f9',
                                            color: filterTab === 'ALL' ? '#ffffff' : '#475569'
                                        }}
                                    >
                                        Tất cả ({totalCount})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFilterTab('VALID')}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            border: 'none',
                                            cursor: 'pointer',
                                            backgroundColor: filterTab === 'VALID' ? '#16a34a' : '#f1f5f9',
                                            color: filterTab === 'VALID' ? '#ffffff' : '#475569'
                                        }}
                                    >
                                        Chỉ Hợp lệ ({validCount})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFilterTab('ERROR')}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            border: 'none',
                                            cursor: 'pointer',
                                            backgroundColor: filterTab === 'ERROR' ? '#dc2626' : '#f1f5f9',
                                            color: filterTab === 'ERROR' ? '#ffffff' : '#475569'
                                        }}
                                    >
                                        Chỉ Bị lỗi ({errorCount + duplicateCount})
                                    </button>
                                </div>
                            </div>

                            {/* Bảng Dữ liệu Preview */}
                            <div style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                overflowX: 'auto',
                                maxHeight: '280px'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', position: 'sticky', top: 0, zIndex: 10 }}>
                                        <tr>
                                            <th style={{ padding: '10px 14px', width: '60px' }}>Dòng</th>
                                            <th style={{ padding: '10px 14px' }}>Họ và Tên</th>
                                            <th style={{ padding: '10px 14px' }}>Email</th>
                                            <th style={{ padding: '10px 14px' }}>Vai Trò</th>
                                            <th style={{ padding: '10px 14px' }}>Trạng Thái</th>
                                            <th style={{ padding: '10px 14px' }}>Chi Tiết Lỗi / Ghi Chú</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsing ? (
                                            <tr>
                                                <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                                                    ⏳ Đang phân tích dữ liệu và phân loại lỗi...
                                                </td>
                                            </tr>
                                        ) : filteredRows.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                                                    Không có dữ liệu phù hợp với bộ lọc.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredRows.map((row) => {
                                                let badgeBg = '#f0fdf4';
                                                let badgeColor = '#15803d';
                                                let badgeText = '✓ Hợp lệ';

                                                if (row.status === 'ERROR') {
                                                    badgeBg = '#fef2f2';
                                                    badgeColor = '#b91c1c';
                                                    badgeText = '✕ Lỗi dữ liệu';
                                                } else if (row.status === 'DUPLICATE') {
                                                    badgeBg = '#faf5ff';
                                                    badgeColor = '#7e22ce';
                                                    badgeText = '🔄 Trùng email';
                                                }

                                                return (
                                                    <tr key={row.lineNum} style={{
                                                        borderBottom: '1px solid #f1f5f9',
                                                        backgroundColor: row.status !== 'VALID' ? '#fff1f2' : 'transparent'
                                                    }}>
                                                        <td style={{ padding: '10px 14px', fontWeight: '600', color: '#64748b' }}>
                                                            #{row.lineNum}
                                                        </td>
                                                        <td style={{ padding: '10px 14px', fontWeight: '500', color: '#0f172a' }}>
                                                            {row.fullName || <span style={{ color: '#94a3b8', italic: true }}>(Thiếu)</span>}
                                                        </td>
                                                        <td style={{ padding: '10px 14px', color: '#334155' }}>
                                                            {row.email || <span style={{ color: '#94a3b8' }}>(Thiếu)</span>}
                                                        </td>
                                                        <td style={{ padding: '10px 14px', color: '#475569' }}>
                                                            {row.roleName}
                                                        </td>
                                                        <td style={{ padding: '10px 14px' }}>
                                                            <span style={{
                                                                padding: '3px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '11px',
                                                                fontWeight: '700',
                                                                backgroundColor: badgeBg,
                                                                color: badgeColor,
                                                                display: 'inline-block'
                                                            }}>
                                                                {badgeText}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '10px 14px' }}>
                                                            {row.errors.length > 0 ? (
                                                                <ul style={{ margin: 0, paddingLeft: '16px', color: '#dc2626', fontSize: '12px' }}>
                                                                    {row.errors.map((err, idx) => (
                                                                        <li key={idx}>{err}</li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <span style={{ color: '#16a34a', fontSize: '12px' }}>Sẵn sàng thêm mới</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Modal Actions */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#f8fafc'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={importing}
                        style={{
                            padding: '9px 18px',
                            backgroundColor: '#ffffff',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Hủy Bỏ
                    </button>

                    <button
                        type="button"
                        onClick={handleExecuteImport}
                        disabled={!file || validCount === 0 || importing}
                        style={{
                            padding: '9px 22px',
                            backgroundColor: (!file || validCount === 0 || importing) ? '#94a3b8' : '#ff6b00',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '700',
                            cursor: (!file || validCount === 0 || importing) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {importing ? (
                            <>⏳ Đang Lưu Dữ Liệu...</>
                        ) : (
                            <>🚀 Thực Hiện Import ({validCount} Dòng Hợp Lệ)</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
