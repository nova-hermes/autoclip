import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Progress,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  message,
  Tooltip,
  Statistic,
  Row,
  Col,
  Divider,
  Badge
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  ReloadOutlined,
  PlusOutlined,
  UploadOutlined,
  EyeOutlined,
  StopOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { TextArea } = Input;
const { Option } = Select;

interface UploadTask {
  task_id: string;
  video_path: string;
  title: string;
  description: string;
  tags: string;
  account_id?: number;
  priority: number;
  status: string;
  created_at: string;
  updated_at: string;
  progress: number;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  celery_task_id?: string;
  bv_id?: string;
}

interface QueueStatus {
  queued_tasks: number;
  processing_tasks: number;
  max_concurrent: number;
  queue_details: Array<{
    task_id: string;
    title: string;
    priority: number;
    created_at: string;
  }>;
  processing_details: Array<{
    task_id: string;
    title: string;
    progress: number;
    account_id: number;
  }>;
}

interface BilibiliAccount {
  id: number;
  username: string;
  nickname?: string;
  status: string;
  is_vip: boolean;
  level: number;
  can_upload: boolean;
}

const UploadQueueManager: React.FC = () => {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [accounts, setAccounts] = useState<BilibiliAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
  const [batchUploadModalVisible, setBatchUploadModalVisible] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();

  // 获取队列Status
  const fetchQueueStatus = async () => {
    try {
      const response = await fetch('/api/upload-queue/status');
      if (response.ok) {
        const data = await response.json();
        setQueueStatus(data);
      }
    } catch (error) {
      console.error('获取队列StatusFailed:', error);
    }
  };

  // 获取Upload历史
  const fetchUploadHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/upload-queue/history?limit=50');
      if (response.ok) {
        const data = await response.json();
        setTasks(data.records || []);
      }
    } catch (error) {
      console.error('获取Upload历史Failed:', error);
      message.error('获取Upload历史Failed');
    } finally {
      setLoading(false);
    }
  };

  // 获取B站账号列表
  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/v1/bilibili/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('获取账号列表Failed:', error);
    }
  };

  // 添加单个任务
  const handleAddTask = async (values: any) => {
    try {
      const response = await fetch('/api/upload-queue/add-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const data = await response.json();
        message.success(`任务已添加: ${data.task_id}`);
        setAddTaskModalVisible(false);
        form.resetFields();
        fetchQueueStatus();
        fetchUploadHistory();
      } else {
        const error = await response.json();
        message.error(`添加任务Failed: ${error.detail}`);
      }
    } catch (error) {
      console.error('添加任务Failed:', error);
      message.error('添加任务Failed');
    }
  };

  // 批量添加任务
  const handleBatchUpload = async (values: any) => {
    try {
      const tasks = values.tasks.split('\n').filter((line: string) => line.trim()).map((line: string) => {
        const [video_path, title, description = '', tags = ''] = line.split('|').map((s: string) => s.trim());
        return {
          video_path,
          title,
          description,
          tags,
          priority: values.priority || 'normal'
        };
      });

      const response = await fetch('/api/upload-queue/add-batch-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tasks }),
      });

      if (response.ok) {
        const data = await response.json();
        message.success(`批量添加了 ${data.count} 个任务`);
        setBatchUploadModalVisible(false);
        batchForm.resetFields();
        fetchQueueStatus();
        fetchUploadHistory();
      } else {
        const error = await response.json();
        message.error(`批量添加Failed: ${error.detail}`);
      }
    } catch (error) {
      console.error('批量添加Failed:', error);
      message.error('批量添加Failed');
    }
  };

  // Cancel任务
  const handleCancelTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/upload-queue/task/${taskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        message.success('任务已Cancel');
        fetchQueueStatus();
        fetchUploadHistory();
      } else {
        const error = await response.json();
        message.error(`Cancel任务Failed: ${error.detail}`);
      }
    } catch (error) {
      console.error('Cancel任务Failed:', error);
      message.error('Cancel任务Failed');
    }
  };

  // Retry任务
  const handleRetryTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/upload-queue/retry/${taskId}`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        message.success(`任务已重新添加: ${data.new_task_id}`);
        fetchQueueStatus();
        fetchUploadHistory();
      } else {
        const error = await response.json();
        message.error(`Retry任务Failed: ${error.detail}`);
      }
    } catch (error) {
      console.error('Retry任务Failed:', error);
      message.error('Retry任务Failed');
    }
  };

  // 获取Status标签
  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      pending: { color: 'default', text: 'Waiting' },
      queued: { color: 'blue', text: '队列中' },
      processing: { color: 'orange', text: 'Processing' },
      completed: { color: 'green', text: 'Completed' },
      failed: { color: 'red', text: 'Failed' },
      cancelled: { color: 'gray', text: '已Cancel' }
    };
    
    const config = statusConfig[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 获取优先级标签
  const getPriorityTag = (priority: number) => {
    const priorityConfig: Record<number, { color: string; text: string }> = {
      1: { color: 'default', text: '低' },
      2: { color: 'blue', text: '普通' },
      3: { color: 'orange', text: '高' },
      4: { color: 'red', text: '紧急' }
    };
    
    const config = priorityConfig[priority] || { color: 'default', text: '普通' };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 表格列定义
  const columns: ColumnsType<UploadTask> = [
    {
      title: '任务ID',
      dataIndex: 'task_id',
      key: 'task_id',
      width: 120,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text.substring(0, 8)}...</span>
        </Tooltip>
      ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: number) => getPriorityTag(priority),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 120,
      render: (progress: number, record: UploadTask) => (
        <Progress 
          percent={progress} 
          size="small" 
          status={record.status === 'failed' ? 'exception' : 'active'}
        />
      ),
    },
    {
      title: '账号ID',
      dataIndex: 'account_id',
      key: 'account_id',
      width: 80,
    },
    {
      title: 'BV号',
      dataIndex: 'bv_id',
      key: 'bv_id',
      width: 120,
      render: (bvId: string) => bvId ? (
        <a href={`https://www.bilibili.com/video/${bvId}`} target="_blank" rel="noopener noreferrer">
          {bvId}
        </a>
      ) : '-',
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record: UploadTask) => (
        <Space size="small">
          {record.status === 'failed' && (
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleRetryTask(record.task_id)}
            >
              Retry
            </Button>
          )}
          {(record.status === 'queued' || record.status === 'processing') && (
            <Button
              type="link"
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => handleCancelTask(record.task_id)}
            >
              Cancel
            </Button>
          )}
          {record.error_message && (
            <Tooltip title={record.error_message}>
              <Button type="link" size="small" icon={<EyeOutlined />}>
                Error
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  useEffect(() => {
    fetchQueueStatus();
    fetchUploadHistory();
    fetchAccounts();

    // 定时RefreshStatus
    const interval = setInterval(() => {
      fetchQueueStatus();
      fetchUploadHistory();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="upload-queue-manager">
      {/* 队列StatusStatistics */}
      {queueStatus && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="队列中任务"
                value={queueStatus.queued_tasks}
                prefix={<Badge status="processing" />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Processing任务"
                value={queueStatus.processing_tasks}
                prefix={<Badge status="success" />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="最大并发数"
                value={queueStatus.max_concurrent}
                prefix={<Badge status="default" />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="可用账号"
                value={accounts.filter(acc => acc.status === 'active' && acc.can_upload).length}
                prefix={<Badge status="success" />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 操作按钮 */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddTaskModalVisible(true)}
          >
            添加任务
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={() => setBatchUploadModalVisible(true)}
          >
            批量Upload
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              fetchQueueStatus();
              fetchUploadHistory();
            }}
          >
            Refresh
          </Button>
        </Space>
      </Card>

      {/* 任务列表 */}
      <Card title="Upload任务">
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="task_id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* 添加任务模态框 */}
      <Modal
        title="添加Upload任务"
        open={addTaskModalVisible}
        onCancel={() => setAddTaskModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddTask}
        >
          <Form.Item
            name="video_path"
            label="视频文件路径"
            rules={[{ required: true, message: 'Please enter视频文件路径' }]}
          >
            <Input placeholder="/path/to/video.mp4" />
          </Form.Item>
          
          <Form.Item
            name="title"
            label="视频Title"
            rules={[{ required: true, message: 'Please enter视频Title' }]}
          >
            <Input placeholder="视频Title" maxLength={80} />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="视频Description"
          >
            <TextArea rows={4} placeholder="视频Description" maxLength={2000} />
          </Form.Item>
          
          <Form.Item
            name="tags"
            label="标签"
          >
            <Input placeholder="标签1,标签2,标签3" />
          </Form.Item>
          
          <Form.Item
            name="account_id"
            label="指定账号"
          >
            <Select placeholder="自动选择最佳账号" allowClear>
              {accounts.filter(acc => acc.status === 'active' && acc.can_upload).map(account => (
                <Option key={account.id} value={account.id}>
                  {account.nickname || account.username} 
                  {account.is_vip && <Tag color="gold">VIP</Tag>}
                  <Tag color="blue">Lv.{account.level}</Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="priority"
            label="优先级"
            initialValue="normal"
          >
            <Select>
              <Option value="low">低</Option>
              <Option value="normal">普通</Option>
              <Option value="high">高</Option>
              <Option value="urgent">紧急</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量Upload模态框 */}
      <Modal
        title="批量Upload任务"
        open={batchUploadModalVisible}
        onCancel={() => setBatchUploadModalVisible(false)}
        onOk={() => batchForm.submit()}
        width={800}
      >
        <Form
          form={batchForm}
          layout="vertical"
          onFinish={handleBatchUpload}
        >
          <Form.Item
            name="tasks"
            label="任务列表"
            rules={[{ required: true, message: 'Please enter任务列表' }]}
            extra="每行一个任务，格式：视频路径|Title|Description|标签"
          >
            <TextArea
              rows={10}
              placeholder={`/path/to/video1.mp4|视频Title1|视频Description1|标签1,标签2
/path/to/video2.mp4|视频Title2|视频Description2|标签3,标签4`}
            />
          </Form.Item>
          
          <Form.Item
            name="priority"
            label="批量优先级"
            initialValue="normal"
          >
            <Select>
              <Option value="low">低</Option>
              <Option value="normal">普通</Option>
              <Option value="high">高</Option>
              <Option value="urgent">紧急</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UploadQueueManager;