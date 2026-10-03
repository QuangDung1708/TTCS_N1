import { Card, Tabs, Typography, Table } from 'antd'
const { Title } = Typography

function WinLossCompetitorManagement() {
      const winLossData = [
    {
      key: '1',
      reason: 'Giá tốt',
      type: 'Thắng',
    },
    {
      key: '2',
      reason: 'Khách hàng chọn đối thủ',
      type: 'Thua',
    },
    {
      key: '3',
      reason: 'Sản phẩm phù hợp nhu cầu',
      type: 'Thắng',
    },
  ]
    const winLossColumns = [
    {
      title: 'STT',
      key: 'index',
      render: (_, __, index) => index + 1,
      width: 80,
    },
    {
      title: 'Lý do',
      dataIndex: 'reason',
      key: 'reason',
    },
    {
      title: 'Kết quả',
      dataIndex: 'type',
      key: 'type',
      width: 120,
    },
  ]
    const competitorData = [
    {
      key: '1',
      name: 'Đối thủ A',
    },
    {
      key: '2',
      name: 'Đối thủ B',
    },
    {
      key: '3',
      name: 'Đối thủ C',
    },
  ]
    const competitorColumns = [
    {
      title: 'STT',
      key: 'index',
      render: (_, __, index) => index + 1,
      width: 80,
    },
    {
      title: 'Tên đối thủ cạnh tranh',
      dataIndex: 'name',
      key: 'name',
    },
  ]
  const items = [
    {
  key: 'win-loss',
  label: 'Lý do Thắng/Thua',
  children: (
    <Table
      rowKey="key"
      dataSource={winLossData}
      columns={winLossColumns}
      pagination={false}
    />
  ),
},
    {
      key: 'competitor',
      label: 'Đối thủ cạnh tranh',
      children: (
  <Table
    rowKey="key"
    dataSource={competitorData}
    columns={competitorColumns}
    pagination={false}
  />
),
    },
  ]
  return (
    <Card style={{ margin: 24 }}>
      <Title level={3}>
        Quản lý Lý do Thắng/Thua và Đối thủ cạnh tranh
      </Title>

      <Tabs items={items} />
    </Card>
  )
}
export default WinLossCompetitorManagement
