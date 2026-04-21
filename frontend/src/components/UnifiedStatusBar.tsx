/**
 * 统一Status栏组件 - 替换旧的复杂进度系统
 * 支持Download中、Processing、Complete等Status的统一显示
 */

import React, { useEffect, useState } from 'react'
import { Progress, Space, Typography, Tag } from 'antd'
import { 
  DownloadOutlined, 
  LoadingOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { useSimpleProgressStore, getStageDisplayName, getStageColor, isCompleted, isFailed } from '../stores/useSimpleProgressStore'

const { Text } = Typography

interface UnifiedStatusBarProps {
  projectId: string
  status: string
  downloadProgress?: number
  onStatusChange?: (status: string) => void
  onDownloadProgressUpdate?: (progress: number) => void
}

export const UnifiedStatusBar: React.FC<UnifiedStatusBarProps> = ({
  projectId,
  status,
  downloadProgress = 0,
  onStatusChange,
  onDownloadProgressUpdate
}) => {
  const { getProgress, startPolling, stopPolling } = useSimpleProgressStore()
  const [isPolling, setIsPolling] = useState(false)
  const [currentDownloadProgress, setCurrentDownloadProgress] = useState(downloadProgress)
  
  const progress = getProgress(projectId)

  // 根据Status决定是否轮询
  useEffect(() => {
    if ((status === 'processing' || status === 'pending') && !isPolling) {
      console.log(`Start轮询处理进度: ${projectId}`)
      startPolling([projectId], 2000)
      setIsPolling(true)
    } else if (status !== 'processing' && status !== 'pending' && isPolling) {
      console.log(`Stop轮询处理进度: ${projectId}`)
      stopPolling()
      setIsPolling(false)
    }

    return () => {
      if (isPolling) {
        console.log(`清理轮询: ${projectId}`)
        stopPolling()
        setIsPolling(false)
      }
    }
  }, [status, projectId, isPolling, startPolling, stopPolling])

  // Download进度轮询
  useEffect(() => {
    if (status === 'downloading') {
      const pollDownloadProgress = async () => {
        try {
          console.log(`轮询Download进度: ${projectId}`)
          const response = await fetch(`/api/v1/projects/${projectId}`)
          if (response.ok) {
            const projectData = await response.json()
            console.log('Project数据:', projectData)
            const newProgress = projectData.processing_config?.download_progress || 0
            console.log(`Download进度更新: ${newProgress}%`)
            setCurrentDownloadProgress(newProgress)
            onDownloadProgressUpdate?.(newProgress)
            
            // 如果DownloadComplete，检查是否需要切换到处理Status
            if (newProgress >= 100) {
              console.log('DownloadComplete，切换到处理Status')
              setTimeout(() => {
                onStatusChange?.('processing')
              }, 1000)
            }
          } else {
            console.error('获取Project数据Failed:', response.status, response.statusText)
          }
        } catch (error) {
          console.error('获取Download进度Failed:', error)
        }
      }

      // 立即获取一次
      pollDownloadProgress()
      
      // 每2秒轮询一次
      const interval = setInterval(pollDownloadProgress, 2000)
      
      return () => clearInterval(interval)
    }
  }, [status, projectId, onDownloadProgressUpdate, onStatusChange])

  // 处理Status变化
  useEffect(() => {
    if (progress && onStatusChange) {
      if (isCompleted(progress.stage)) {
        onStatusChange('completed')
      } else if (isFailed(progress.message)) {
        onStatusChange('failed')
      }
    }
  }, [progress, onStatusChange])

  // 导入中Status
  if (status === 'importing') {
    return (
      <div style={{
        background: 'rgba(255, 193, 7, 0.1)',
        border: '1px solid rgba(255, 193, 7, 0.3)',
        borderRadius: '3px',
        padding: '3px 6px',
        textAlign: 'center',
        width: '100%'
      }}>
        <div style={{ 
          color: '#ffc107',
          fontSize: '11px', 
          fontWeight: 600, 
          lineHeight: '12px'
        }}>
          {Math.round(downloadProgress)}%
        </div>
        <div style={{ 
          color: '#999999', 
          fontSize: '8px', 
          lineHeight: '9px'
        }}>
          导入中
        </div>
      </div>
    )
  }

  // Download中Status
  if (status === 'downloading') {
    return (
      <div style={{
        background: 'rgba(24, 144, 255, 0.1)',
        border: '1px solid rgba(24, 144, 255, 0.3)',
        borderRadius: '3px',
        padding: '3px 6px',
        textAlign: 'center',
        width: '100%'
      }}>
        <div style={{ 
          color: '#1890ff',
          fontSize: '11px', 
          fontWeight: 600, 
          lineHeight: '12px'
        }}>
          {Math.round(currentDownloadProgress)}%
        </div>
        <div style={{ 
          color: '#999999', 
          fontSize: '8px', 
          lineHeight: '9px'
        }}>
          Download中
        </div>
      </div>
    )
  }

  // ProcessingStatus - 使用新的简化进度系统
  if (status === 'processing') {
    if (!progress) {
      // 等待进度数据
      return (
      <div style={{
        background: 'rgba(82, 196, 26, 0.1)',
        border: '1px solid rgba(82, 196, 26, 0.3)',
        borderRadius: '3px',
        padding: '3px 6px',
        textAlign: 'center',
        width: '100%'
      }}>
        <div style={{ 
          color: '#52c41a',
          fontSize: '11px', 
          fontWeight: 600, 
          lineHeight: '12px'
        }}>
          0%
        </div>
        <div style={{ 
          color: '#999999', 
          fontSize: '8px', 
          lineHeight: '9px'
        }}>
          初始化中...
        </div>
      </div>
      )
    }

    const { stage, percent, message } = progress
    const stageDisplayName = getStageDisplayName(stage)
    const stageColor = getStageColor(stage)
    const failed = isFailed(message)

    return (
      <div style={{
        background: failed 
          ? 'rgba(255, 77, 79, 0.1)'
          : 'rgba(82, 196, 26, 0.1)',
        border: failed 
          ? '1px solid rgba(255, 77, 79, 0.3)'
          : '1px solid rgba(82, 196, 26, 0.3)',
        borderRadius: '3px',
        padding: '3px 6px',
        textAlign: 'center',
        width: '100%'
      }}>
        <div style={{ 
          color: failed ? '#ff4d4f' : '#52c41a',
          fontSize: '11px', 
          fontWeight: 600, 
          lineHeight: '12px'
        }}>
          {failed ? '✗ Failed' : `${percent}%`}
        </div>
        <div style={{ 
          color: '#999999', 
          fontSize: '8px', 
          lineHeight: '9px',
          minHeight: '9px' // 确保FailedStatus也有固定高度
        }}>
          {failed ? '' : stageDisplayName}
        </div>
      </div>
    )
  }

  // CompletedStatus
  if (status === 'completed') {
    return (
      <div style={{
        background: 'rgba(82, 196, 26, 0.1)',
        border: '1px solid rgba(82, 196, 26, 0.3)',
        borderRadius: '3px',
        padding: '3px 6px',
        textAlign: 'center',
        width: '100%'
      }}>
        <div style={{ 
          color: '#52c41a',
          fontSize: '11px', 
          fontWeight: 600, 
          lineHeight: '12px'
        }}>
          ✓
        </div>
        <div style={{ 
          color: '#999999', 
          fontSize: '8px', 
          lineHeight: '9px'
        }}>
          Completed
        </div>
      </div>
    )
  }

  // FailedStatus
  if (status === 'failed') {
    return (
      <div style={{
        background: 'rgba(255, 77, 79, 0.1)',
        border: '1px solid rgba(255, 77, 79, 0.3)',
        borderRadius: '3px',
        padding: '3px 6px',
        textAlign: 'center',
        width: '100%'
      }}>
        <div style={{ 
          color: '#ff4d4f',
          fontSize: '11px', 
          fontWeight: 600, 
          lineHeight: '12px'
        }}>
          ✗ Failed
        </div>
        <div style={{ 
          color: '#999999', 
          fontSize: '8px', 
          lineHeight: '9px',
          minHeight: '9px' // 确保FailedStatus也有固定高度
        }}>
          Processing Failed
        </div>
      </div>
    )
  }

  // 等待Status
  return (
    <div style={{
      background: 'rgba(217, 217, 217, 0.1)',
      border: '1px solid rgba(217, 217, 217, 0.3)',
      borderRadius: '3px',
      padding: '3px 6px',
      textAlign: 'center',
      width: '100%'
    }}>
      <div style={{ 
        color: '#d9d9d9',
        fontSize: '11px', 
        fontWeight: 600, 
        lineHeight: '12px'
      }}>
        ○ Waiting
      </div>
      <div style={{ 
        color: '#999999', 
        fontSize: '8px', 
        lineHeight: '9px',
        minHeight: '9px' // 确保等待Status也有固定高度
      }}>
        等待处理
      </div>
    </div>
  )
}

// 简化的进度条组件 - 用于详细进度显示
interface SimpleProgressDisplayProps {
  projectId: string
  status: string
  showDetails?: boolean
}

export const SimpleProgressDisplay: React.FC<SimpleProgressDisplayProps> = ({
  projectId,
  status,
  showDetails = false
}) => {
  const { getProgress } = useSimpleProgressStore()
  const progress = getProgress(projectId)

  if (status !== 'processing' || !progress || !showDetails) {
    return null
  }

  const { stage, percent, message } = progress
  const stageDisplayName = getStageDisplayName(stage)
  const stageColor = getStageColor(stage)

  return (
    <div style={{ marginTop: '8px' }}>
      <Progress
        percent={percent}
        strokeColor={stageColor}
        showInfo={true}
        size="small"
        format={(percent) => `${percent}%`}
      />
      {message && (
        <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '4px' }}>
          {message}
        </Text>
      )}
    </div>
  )
}
