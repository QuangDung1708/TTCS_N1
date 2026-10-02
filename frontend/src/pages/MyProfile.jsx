import { Card, Form, Input, Button } from 'antd'
import { useUser } from '../context/UserContext.jsx'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

function MyProfile() {
  const { userInfo } = useUser()

  return (
    <Card
  title="Hồ sơ cá nhân"
  style={{ maxWidth: 700, margin: '24px auto' }}
>
  <Form
    layout="vertical"
    onFinish={(values) => {
      console.log('Thông tin cập nhật:', values)
    }}
  >
    <Form.Item
      label="Họ và tên"
      name="full_name"
    >
      <Input placeholder="Nhập họ và tên" />
    </Form.Item>

    <Form.Item
  label="Số điện thoại"
  name="phone"
  rules={[
    {
      pattern: /^0\d{9}$/,
      message: 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0',
    },
  ]}
>
  <Input
    placeholder="Nhập số điện thoại"
    maxLength={10}
    inputMode="numeric"
  />
</Form.Item>

<Form.Item
  label="Chữ ký email"
  name="email_signature"
>
  <ReactQuill
    theme="snow"
    placeholder="Nhập chữ ký email..."
  />
</Form.Item>

    <Form.Item
      label="Email"
    >
      <Input disabled value={userInfo?.email || ''} />
    </Form.Item>

    <Form.Item
      label="Vai trò"
    >
      <Input disabled value={userInfo?.role_name || ''} />
    </Form.Item>

    <Form.Item
      label="Nhóm"
    >
      <Input disabled value={userInfo?.group_id || ''} />
    </Form.Item>

    <Form.Item>
      <Button type="primary" htmlType="submit">
        Cập nhật thông tin
      </Button>
    </Form.Item>
  </Form>
</Card>
  )
}

export default MyProfile
