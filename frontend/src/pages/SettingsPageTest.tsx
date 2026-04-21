import React from 'react'
import { Layout, Card, Form, Input, Button, Typography, Space, Alert, Divider, Row, Col } from 'antd'
import { KeyOutlined, SaveOutlined, ApiOutlined, SettingOutlined, InfoCircleOutlined } from '@ant-design/icons'
import './SettingsPage.css'

const { Content } = Layout
const { Title, Text, Paragraph } = Typography

const SettingsPageTest: React.FC = () => {
  const [form] = Form.useForm()

  return (
    <Content className="settings-page">
      <div className="settings-container">
        <Title level={2} className="settings-title">
          <SettingOutlined /> 系统配置测试
        </Title>
        
        <Card title="API 配置" className="settings-card">
          <Alert
            message="配置说明"
            description="请配置DashScopeAPIAPI Key以启用AI自动Clip功能。您可以在阿里云控制台获取APIAPI Key。"
            type="info"
            showIcon
            className="settings-alert"
          />
          
          <Form
            form={form}
            layout="vertical"
            className="settings-form"
            initialValues={{
              model_name: 'qwen-plus',
              chunk_size: 5000,
              min_score_threshold: 0.7,
              max_clips_per_collection: 5
            }}
          >
            <Form.Item
              label="DashScope API Key"
              name="dashscope_api_key"
              className="form-item"
              rules={[
                { required: true, message: 'Please enterAPIAPI Key' },
                { min: 10, message: 'APIAPI Key长度不能少于10位' }
              ]}
            >
              <Input.Password
                placeholder="Please enterDashScopeAPIAPI Key"
                prefix={<KeyOutlined />}
                className="settings-input"
              />
            </Form.Item>

            <Form.Item className="form-item">
              <Button
                type="default"
                icon={<ApiOutlined />}
                className="test-button"
              >
                测试连接
              </Button>
            </Form.Item>

            <Divider className="settings-divider" />

            <Title level={4} className="section-title">Model配置</Title>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="ModelName"
                  name="model_name"
                  className="form-item"
                >
                  <Input placeholder="qwen-plus" className="settings-input" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="文本分块Size"
                  name="chunk_size"
                  className="form-item"
                >
                  <Input 
                    type="number" 
                    placeholder="5000" 
                    addonAfter="字符" 
                    className="settings-input"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="最低Score阈值"
                  name="min_score_threshold"
                  className="form-item"
                >
                  <Input 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    max="1" 
                    placeholder="0.7" 
                    className="settings-input"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="每个Collection最大Clip数"
                  name="max_clips_per_collection"
                  className="form-item"
                >
                  <Input 
                    type="number" 
                    placeholder="5" 
                    addonAfter="个" 
                    className="settings-input"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item className="form-item">
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                size="large"
                className="save-button"
              >
                Save配置
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card title="使用说明" className="settings-card">
          <Space direction="vertical" size="large" className="instructions-space">
            <div className="instruction-item">
              <Title level={5} className="instruction-title">
                <InfoCircleOutlined /> 1. 获取APIAPI Key
              </Title>
              <Paragraph className="instruction-text">
                访问阿里云控制台 → 人工智能 → DashScope → APIAPI Key管理，创建新的APIAPI Key
              </Paragraph>
            </div>
            
            <div className="instruction-item">
              <Title level={5} className="instruction-title">
                <InfoCircleOutlined /> 2. 配置参数说明
              </Title>
              <Paragraph className="instruction-text">
                • <Text strong>文本分块Size</Text>：影响处理速度和精度，建议5000字符<br />
                • <Text strong>Score阈值</Text>：只有高于此分数的Clip才会被保留<br />
                • <Text strong>CollectionClip数</Text>：控制每个TopicCollection包含的ClipCount
              </Paragraph>
            </div>
            
            <div className="instruction-item">
              <Title level={5} className="instruction-title">
                <InfoCircleOutlined /> 3. 测试连接
              </Title>
              <Paragraph className="instruction-text">
                Save前建议先测试APIAPI Key是否有效，确保服务正常运行
              </Paragraph>
            </div>
          </Space>
        </Card>
      </div>
    </Content>
  )
}

export default SettingsPageTest 