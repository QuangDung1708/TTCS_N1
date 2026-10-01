import { Card, Form, Input, Button } from 'antd'
import { useUser } from '../context/UserContext.jsx'

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
        >
          <Input placeholder="Nhập số điện thoại" />
        </Form.Item>

        <Form.Item label="Email">
          <Input
            disabled
            value={userInfo?.email || ''}
          />
        </Form.Item>

        <Form.Item label="Vai trò">
          <Input
            disabled
            value={userInfo?.role_name || ''}
          />
        </Form.Item>

        <Form.Item label="Nhóm">
          <Input
            disabled
            value={userInfo?.group_id || ''}
          />
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
