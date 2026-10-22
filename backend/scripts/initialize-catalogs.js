require("dotenv").config();
const {
  initializeReferenceCatalogs,
} = require("../src/core/referenceCatalogs");
const { db } = require("../src/core/store");
initializeReferenceCatalogs()
  .then((r) =>
    console.log(
      r.initialized
        ? `Đã thêm ${r.inserted} mục danh mục dùng chung.`
        : "Danh mục đã được khởi tạo; giữ nguyên cấu hình hiện có.",
    ),
  )
  .catch((e) => {
    console.error("Không khởi tạo được danh mục:", e.code || e.message);
    process.exitCode = 1;
  })
  .finally(() => db.end());
