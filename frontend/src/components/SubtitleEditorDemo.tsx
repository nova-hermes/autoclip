import React, { useState } from 'react'
import { Button, Card, Space, Typography } from 'antd'
import { PlayCircleOutlined } from '@ant-design/icons'
import SubtitleEditor from './SubtitleEditor'
import { SubtitleSegment, VideoEditOperation } from '../types/subtitle'

const { Title, Text } = Typography

const SubtitleEditorDemo: React.FC = () => {
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  // 模拟Subtitles数据
  const mockSubtitles: SubtitleSegment[] = [
    {
      id: '1',
      startTime: 0,
      endTime: 11,
      words: [
        { id: '1-1', text: '欢迎', startTime: 0, endTime: 2 },
        { id: '1-2', text: '大家', startTime: 2, endTime: 4 },
        { id: '1-3', text: '使用', startTime: 4, endTime: 6 },
        { id: '1-4', text: '字影', startTime: 6, endTime: 8 },
        { id: '1-5', text: '。', startTime: 8, endTime: 11 }
      ]
    },
    {
      id: '2',
      startTime: 11,
      endTime: 13,
      words: [
        { id: '2-1', text: '字影', startTime: 11, endTime: 12 },
        { id: '2-2', text: '是', startTime: 12, endTime: 12.5 },
        { id: '2-3', text: '一款', startTime: 12.5, endTime: 13 }
      ]
    },
    {
      id: '3',
      startTime: 13,
      endTime: 14,
      words: [
        { id: '3-1', text: '极致', startTime: 13, endTime: 13.5 },
        { id: '3-2', text: '简单的', startTime: 13.5, endTime: 14 }
      ]
    },
    {
      id: '4',
      startTime: 14,
      endTime: 17,
      words: [
        { id: '4-1', text: '视频', startTime: 14, endTime: 15 },
        { id: '4-2', text: 'Edit', startTime: 15, endTime: 16 },
        { id: '4-3', text: '产品', startTime: 16, endTime: 17 },
        { id: '4-4', text: '。', startTime: 17, endTime: 17 }
      ]
    },
    {
      id: '5',
      startTime: 17,
      endTime: 18,
      words: [
        { id: '5-1', text: '字影', startTime: 17, endTime: 17.5 },
        { id: '5-2', text: '最', startTime: 17.5, endTime: 17.8 },
        { id: '5-3', text: '主要', startTime: 17.8, endTime: 18 }
      ]
    },
    {
      id: '6',
      startTime: 18,
      endTime: 23,
      words: [
        { id: '6-1', text: '的', startTime: 18, endTime: 18.2 },
        { id: '6-2', text: '创新', startTime: 18.2, endTime: 19 },
        { id: '6-3', text: '是', startTime: 19, endTime: 19.5 },
        { id: '6-4', text: '通过', startTime: 19.5, endTime: 20 },
        { id: '6-5', text: '文字', startTime: 20, endTime: 21 },
        { id: '6-6', text: '来', startTime: 21, endTime: 21.5 },
        { id: '6-7', text: 'Edit', startTime: 21.5, endTime: 22.5 },
        { id: '6-8', text: '视频', startTime: 22.5, endTime: 23 },
        { id: '6-9', text: '，', startTime: 23, endTime: 23 }
      ]
    }
  ]

  const handleSave = (operations: VideoEditOperation[]) => {
    console.log('Save的Edit操作:', operations)
    setIsEditorOpen(false)
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ color: '#ffffff', marginBottom: '16px' }}>
          SubtitlesEdit器演示
        </Title>
        <Text style={{ color: '#cccccc', fontSize: '16px', display: 'block', marginBottom: '24px' }}>
          这是一个重新设计的SubtitlesEdit器，参考了现代视频Edit软件的布局和交互设计。
        </Text>
        
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text style={{ color: '#ffffff', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
              主要功能特性：
            </Text>
            <ul style={{ color: '#cccccc', fontSize: '14px', lineHeight: '1.6' }}>
              <li>三栏布局：左侧Subtitles列表、中间样式选择、右侧视频Play器</li>
              <li>右键菜单：支持DeleteClip、关联素材、重置、隐藏Subtitles、高亮等操作</li>
              <li>实时预览：点击Subtitles段可跳转到对应时间点</li>
              <li>样式模板：提供多种Subtitles样式选择</li>
              <li>Edit历史：支持撤销/重做操作</li>
              <li>现代化UI：深色Topic，流畅的动画效果</li>
            </ul>
          </div>

          <div>
            <Text style={{ color: '#ffffff', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
              操作说明：
            </Text>
            <ul style={{ color: '#cccccc', fontSize: '14px', lineHeight: '1.6' }}>
              <li>点击Subtitles段可跳转到视频对应时间点</li>
              <li>点击单词可选择/Cancel选择（Ctrl/Cmd+点击可多选）</li>
              <li>右键点击Subtitles段可打开上下文菜单</li>
              <li>使用Edit工具进行Delete、撤销、重做等操作</li>
              <li>选择样式模板可预览不同效果</li>
            </ul>
          </div>

          <Button 
            type="primary" 
            size="large" 
            icon={<PlayCircleOutlined />}
            onClick={() => setIsEditorOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              border: 'none',
              height: '48px',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            打开SubtitlesEdit器
          </Button>
        </Space>
      </Card>

      {isEditorOpen && (
        <SubtitleEditor
          videoUrl="https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4"
          subtitles={mockSubtitles}
          onSave={handleSave}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
    </div>
  )
}

export default SubtitleEditorDemo
