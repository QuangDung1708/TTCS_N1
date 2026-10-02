import { useState } from 'react'
import { Card, Tabs, Typography, Table, Button, Space } from 'antd'
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
const { Title } = Typography
function CommonCategoryManagement() {
      const [activeTab, setActiveTab] = useState('category-1')

  const [categoryData, setCategoryData] = useState({
    'category-1': [
      { key: '1', value: 'Giá trị 1', displayOrder: 1 },
      { key: '2', value: 'Giá trị 2', displayOrder: 2 },
      { key: '3', value: 'Giá trị 3', displayOrder: 3 },
    ],
    'category-2': [
      { key: '4', value: 'Giá trị A', displayOrder: 1 },
      { key: '5', value: 'Giá trị B', displayOrder: 2 },
      { key: '6', value: 'Giá trị C', displayOrder: 3 },
    ],
    'category-3': [
      { key: '7', value: 'Giá trị X', displayOrder: 1 },
      { key: '8', value: 'Giá trị Y', displayOrder: 2 },
      { key: '9', value: 'Giá trị Z', displayOrder: 3 },
    ],
  })
    const moveItem = (index, direction) => {
    const currentData = [...categoryData[activeTab]]

    const newIndex = index + direction

    if (newIndex < 0 || newIndex >= currentData.length) {
      return
    }

    const temp = currentData[index]
    currentData[index] = currentData[newIndex]
    currentData[newIndex] = temp

    const updatedData = currentData.map((item, itemIndex) => ({
      ...item,
      displayOrder: itemIndex + 1,
    }))

    setCategoryData({
      ...categoryData,
      [activeTab]: updatedData,
    })
  }
  const columns = [
   
    {
      title: 'STT',
      dataIndex: 'displayOrder',
      key: 'displayOrder',
      width: 80,
    },
    {
      title: 'Giá trị',
      dataIndex: 'value',
      key: 'value',
    },
    {
      title: 'Thứ tự hiển thị',
      dataIndex: 'displayOrder',
      key: 'displayOrder',
      width: 150,
    },
     {
  title: 'Thao tác',
  key: 'action',
  width: 140,
  render: (_, record, index) => (
    <Space>
      <Button
        size="small"
        icon={<ArrowUpOutlined />}
        disabled={index === 0}
        onClick={() => moveItem(index, -1)}
      />
      <Button
        size="small"
        icon={<ArrowDownOutlined />}
        disabled={index === categoryData[activeTab].length - 1}
        onClick={() => moveItem(index, 1)}
      />
    </Space>
  ),
},
  ]
  const items = [
      
    {
      key: 'category-1',
      label: 'Danh mục 1',
      children: (
  <Table
    rowKey="key"
    dataSource={categoryData['category-1']}
    columns={columns}
    pagination={false}
  />
),
    },
    {
      key: 'category-2',
      label: 'Danh mục 2',
      children: (
  <Table
    rowKey="key"
    dataSource={categoryData['category-2']}
    columns={columns}
    pagination={false}
  />
),
    },
    {
      key: 'category-3',
      label: 'Danh mục 3',
      children: (
  <Table
    rowKey="key"
    dataSource={categoryData['category-3']}
    columns={columns}
    pagination={false}
  />
),
    },
  ]
  return (
    <Card style={{ margin: 24 }}>
      <Title level={3}>Quản lý Danh mục dùng chung</Title>

<Tabs
  items={items}
  activeKey={activeTab}
  onChange={setActiveTab}
/>
    </Card>
  )
}
export default CommonCategoryManagement
