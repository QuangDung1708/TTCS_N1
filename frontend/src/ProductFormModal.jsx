import { useEffect } from 'react'
import { Modal, Form, Input, InputNumber } from 'antd'

function ProductFormModal({
  open,
  product,
  onCancel,
  onSubmit,
}) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (open) {
      if (product) {
        form.setFieldsValue(product)
      } else {
        form.resetFields()
      }
    }
  }, [open, product, form])

  const handleFinish = (values) => {
    onSubmit(values)
  }

  return (
    <Modal
      title={product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
      open={open}
      onCancel={onCancel}
      okText={product ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
      cancelText="Hủy"
      onOk={() => form.submit()}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
      >
        <Form.Item
          label="Mã sản phẩm"
          name="code"
          rules={[
            {
              required: true,
              message: 'Vui lòng nhập mã sản phẩm',
            },
          ]}
        >
          <Input placeholder="Nhập mã sản phẩm" />
        </Form.Item>

        <Form.Item
          label="Tên sản phẩm"
          name="name"
          rules={[
            {
              required: true,
              message: 'Vui lòng nhập tên sản phẩm',
            },
          ]}
        >
          <Input placeholder="Nhập tên sản phẩm" />
        </Form.Item>

        <Form.Item
          label="Loại"
          name="type"
          rules={[
            {
              required: true,
              message: 'Vui lòng nhập loại sản phẩm',
            },
          ]}
        >
          <Input placeholder="Nhập loại sản phẩm" />
        </Form.Item>

        <Form.Item
          label="Đơn vị tính"
          name="unit"
          rules={[
            {
              required: true,
              message: 'Vui lòng nhập đơn vị tính',
            },
          ]}
        >
          <Input placeholder="Ví dụ: Cái, Hộp, Kg..." />
        </Form.Item>

        <Form.Item
          label="Giá niêm yết"
          name="listed_price"
          rules={[
            {
              required: true,
              message: 'Vui lòng nhập giá niêm yết',
            },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            placeholder="Nhập giá niêm yết"
          />
        </Form.Item>

        <Form.Item
          label="Giá sàn"
          name="floor_price"
          rules={[
            {
              required: true,
              message: 'Vui lòng nhập giá sàn',
            },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            placeholder="Nhập giá sàn"
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ProductFormModal