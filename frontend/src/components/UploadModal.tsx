import React, { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Progress,
  message,
  Divider,
  Row,
  Col,
  Typography,
  Alert,
  Spin
} from 'antd'
import {
  UploadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { uploadApi } from '../services/uploadApi'
import { BILIBILI_PARTITIONS } from '../services/uploadApi'

const { Option } = Select
const { TextArea } = Input
const { Text } = Typography

interface UploadModalProps {
  visible: boolean
  onCancel: () => void
  projectId: string
  clipIds: string[]
  clipTitles: string[]
  onSuccess?: () => void
}

interface UploadProgress {
  status: 'pending' | 'processing' | 'success' | 'failed'
  message: string
  progress: number
  bvid?: string
  error?: string
}

const UploadModal: React.FC<UploadModalProps> = ({
  visible,
  onCancel,
  projectId,
  clipIds,
  clipTitles,
  onSuccess
}) => {
  const [form] = Form.useForm()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: 'pending',
    message: '准备Upload...',
    progress: 0
  })
  const [uploadRecordId, setUploadRecordId] = useState<string>('')
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null)

  // 表单初始值
  const initialValues = {
    title: clipTitles.length === 1 ? clipTitles[0] : `${clipTitles[0]} 等${clipIds.length}个视频`,
    description: '',
    tags: [],
    partition_id: undefined,
    account_id: undefined
  }

  // 获取B站账号列表
  const [accounts, setAccounts] = useState<any[]>([])
  useEffect(() => {
    if (visible) {
      // 调用API获取B站账号列表
      uploadApi.getBilibiliAccounts()
        .then(data => {
          setAccounts(data)
        })
        .catch(error => {
          console.error('获取B站账号列表Failed:', error)
          // 如果API调用Failed，使用默认账号
          setAccounts([
            { id: '1', name: '主账号', username: 'main_account' }
          ])
        })
    }
  }, [visible])

  // Submit投稿
  const handleSubmit = async (values: any) => {
    // 显示开发中Notice
    message.info('B站Upload功能正在开发中，敬请期待！', 3)
    return
    
    // 原有代码已禁用
    if (!values.account_id) {
      message.error('Please selectB站账号')
      return
    }

    setUploading(true)
    setUploadProgress({
      status: 'pending',
      message: '正在创建投稿任务...',
      progress: 10
    })

    try {
      // 创建投稿任务
      const response = await uploadApi.createUploadTask(projectId, {
        clip_ids: clipIds,
        account_id: values.account_id,
        title: values.title,
        description: values.description,
        tags: values.tags,
        partition_id: values.partition_id
      })

      setUploadRecordId(response.record_id)
      setUploadProgress({
        status: 'processing',
        message: `投稿任务已创建，正在处理 ${response.clip_count} 个视频...`,
        progress: 30
      })

      // Start轮询UploadStatus
      startPolling(response.record_id)

      message.success('投稿任务创建Success！')
    } catch (error: any) {
      console.error('创建投稿任务Failed:', error)
      setUploadProgress({
        status: 'failed',
        message: `创建投稿任务Failed: ${error.message || '未知Error'}`,
        progress: 0,
        error: error.message
      })
      setUploading(false)
    }
  }

  // Start轮询UploadStatus
  const startPolling = (recordId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await uploadApi.getUploadRecord(recordId)
        
        if (status.status === 'success') {
          setUploadProgress({
            status: 'success',
            message: '投稿Success！',
            progress: 100,
            bvid: status.bvid
          })
          setUploading(false)
          clearInterval(interval)
          
          // 延迟Close弹窗，让用户看到SuccessStatus
          setTimeout(() => {
            onSuccess?.()
            onCancel()
          }, 2000)
        } else if (status.status === 'failed') {
          setUploadProgress({
            status: 'failed',
            message: `投稿Failed: ${status.error_message || '未知Error'}`,
            progress: 0,
            error: status.error_message
          })
          setUploading(false)
          clearInterval(interval)
        } else if (status.status === 'processing') {
          setUploadProgress({
            status: 'processing',
            message: '正在Upload到B站...',
            progress: 60
          })
        } else if (status.status === 'pending') {
          setUploadProgress({
            status: 'processing',
            message: '任务Queued，请稍候...',
            progress: 40
          })
        } else {
          // 其他Status，逐步增加进度
          setUploadProgress(prev => ({
            ...prev,
            message: `任务Status: ${status.status}`,
            progress: Math.min(prev.progress + 5, 90)
          }))
        }
      } catch (error) {
        console.error('获取UploadStatusFailed:', error)
        setUploadProgress({
          status: 'failed',
          message: '获取UploadStatusFailed',
          progress: 0,
          error: 'Network error'
        })
        setUploading(false)
        clearInterval(interval)
      }
    }, 2000)

    setPollingInterval(interval)
  }

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [pollingInterval])

  // 弹窗Close时清理Status
  const handleCancel = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }
    setUploading(false)
    setUploadProgress({
      status: 'pending',
      message: '准备Upload...',
      progress: 0
    })
    setUploadRecordId('')
    form.resetFields()
    onCancel()
  }

  // Cancel投稿任务
  const handleCancelUpload = async () => {
    if (!uploadRecordId) {
      handleCancel()
      return
    }

    try {
      // 调用Cancel投稿API
      await uploadApi.cancelUploadTask(uploadRecordId)
      
      // 清理Status
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
      setUploading(false)
      setUploadProgress({
        status: 'pending',
        message: '准备Upload...',
        progress: 0
      })
      setUploadRecordId('')
      form.resetFields()
      
      // 显示CancelSuccess消息
      message.success('投稿任务已Cancel')
      onCancel()
    } catch (error) {
      console.error('Cancel投稿Failed:', error)
      message.error('Cancel投稿Failed，请Retry')
    }
  }

  // 获取Status图标
  const getStatusIcon = () => {
    switch (uploadProgress.status) {
      case 'pending':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />
      case 'processing':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      default:
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />
    }
  }

  // 获取进度条Status
  const getProgressStatus = () => {
    if (uploadProgress.status === 'failed') return 'exception'
    if (uploadProgress.status === 'success') return 'success'
    return 'active'
  }

  return (
    <Modal
      title={
        <Space>
          <UploadOutlined style={{ color: '#1890ff' }} />
          <span>投稿到B站</span>
          {clipIds.length > 1 && (
            <Tag color="blue">{clipIds.length} 个视频</Tag>
          )}
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={700}
      destroyOnClose
      maskClosable={!uploading}
      closable={!uploading}
    >
      {!uploading ? (
        // 投稿表单
        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="B站账号"
                name="account_id"
                rules={[{ required: true, message: 'Please selectB站账号' }]}
              >
                <Select placeholder="选择要使用的B站账号">
                  {accounts.map(account => (
                    <Option key={account.id} value={account.id}>
                      {account.nickname || account.username} ({account.username})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="分区"
                name="partition_id"
                rules={[{ required: true, message: 'Please select视频分区' }]}
              >
                <Select placeholder="选择视频分区" showSearch>
                  {BILIBILI_PARTITIONS.map(partition => (
                    <Option key={partition.id} value={partition.id}>
                      {partition.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: 'Please enter视频Title' }]}
          >
            <Input placeholder="输入视频Title" maxLength={80} showCount />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: 'Please enter视频Description' }]}
          >
            <TextArea
              placeholder="输入视频Description"
              rows={4}
              maxLength={250}
              showCount
            />
          </Form.Item>

          <Form.Item
            label="标签"
            name="tags"
            extra="最多添加10个标签，用逗号分隔"
          >
            <Select
              mode="tags"
              placeholder="输入标签，按回车Confirm"
              maxTagCount={10}
              maxTagTextLength={20}
            />
          </Form.Item>

          <Divider />

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                type="primary"
                onClick={() => message.info('开发中，敬请期待', 3)}
                icon={<UploadOutlined />}
              >
                Start投稿
              </Button>
            </Space>
          </div>
        </Form>
      ) : (
        // Upload进度
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ marginBottom: '24px' }}>
            {getStatusIcon()}
            <Text style={{ marginLeft: '8px', fontSize: '16px' }}>
              {uploadProgress.message}
            </Text>
          </div>

          <Progress
            percent={uploadProgress.progress}
            status={getProgressStatus()}
            strokeWidth={8}
            style={{ marginBottom: '24px' }}
          />

          {uploadProgress.status === 'success' && uploadProgress.bvid && (
            <Alert
              message="投稿Success！"
              description={`BV号: ${uploadProgress.bvid}`}
              type="success"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}

          {uploadProgress.status === 'failed' && uploadProgress.error && (
            <Alert
              message="投稿Failed"
              description={uploadProgress.error}
              type="error"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}

          {uploadProgress.status === 'processing' && (
            <div style={{ color: '#666', fontSize: '14px' }}>
              <Spin size="small" style={{ marginRight: '8px' }} />
              正在Processing，请稍候...
              {uploadRecordId && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#999' }}>
                  任务ID: {uploadRecordId}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: '16px' }}>
            {uploadProgress.status === 'failed' && (
              <Button
                type="primary"
                onClick={() => {
                  setUploading(false)
                  setUploadProgress({
                    status: 'pending',
                    message: '准备Upload...',
                    progress: 0
                  })
                }}
                style={{ marginRight: '8px' }}
              >
                重新投稿
              </Button>
            )}
            
            <Button
              onClick={handleCancelUpload}
              disabled={uploadProgress.status === 'success'}
            >
              {uploadProgress.status === 'success' ? 'Close' : 'Cancel投稿'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default UploadModal
