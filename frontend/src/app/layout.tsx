'use client';

import { ReactNode } from 'react';

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <title>575 SNS - 俳句特化型SNS</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #fafafa;
            color: #333;
          }

          a {
            text-decoration: none;
            color: inherit;
          }

          button {
            cursor: pointer;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            background-color: #007bff;
            color: white;
            font-size: 14px;
            transition: background-color 0.2s;
          }

          button:hover {
            background-color: #0056b3;
          }

          input, textarea {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-family: inherit;
          }

          textarea {
            resize: vertical;
            font-size: 14px;
          }

          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }

          .header {
            background-color: white;
            padding: 20px;
            border-bottom: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }

          .header h1 {
            font-size: 24px;
            color: #333;
          }

          .auth-section {
            display: flex;
            gap: 10px;
          }

          .auth-section button {
            padding: 6px 12px;
            font-size: 12px;
          }

          .post-form {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .post-form textarea {
            width: 100%;
            height: 100px;
            margin-bottom: 10px;
          }

          .post-form .hint {
            font-size: 12px;
            color: #666;
            margin-bottom: 10px;
          }

          .post-form button {
            width: 100%;
          }

          .error {
            color: #dc3545;
            font-size: 12px;
            margin-bottom: 10px;
          }

          .success {
            color: #28a745;
            font-size: 12px;
            margin-bottom: 10px;
          }

          .post {
            background-color: white;
            padding: 16px;
            margin-bottom: 10px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .post-header {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
          }

          .post-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: #007bff;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
          }

          .post-info {
            flex: 1;
          }

          .post-username {
            font-weight: bold;
            margin-bottom: 4px;
          }

          .post-time {
            font-size: 12px;
            color: #999;
          }

          .post-content {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 10px;
            white-space: pre-wrap;
            word-break: break-word;
          }

          .post-actions {
            display: flex;
            gap: 10px;
            border-top: 1px solid #eee;
            padding-top: 10px;
          }

          .action-btn {
            flex: 1;
            background-color: transparent;
            color: #666;
            border: 1px solid #ddd;
            padding: 8px;
            font-size: 12px;
          }

          .action-btn:hover {
            background-color: #f0f0f0;
            color: #333;
          }

          .action-btn.active {
            color: #dc3545;
          }

          .modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal-content {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            width: 90%;
            max-width: 400px;
          }

          .modal-content h2 {
            margin-bottom: 20px;
          }

          .modal-content input {
            width: 100%;
            margin-bottom: 15px;
            padding: 10px;
          }

          .modal-content button {
            width: 100%;
            margin-bottom: 10px;
          }

          .modal-close {
            cursor: pointer;
            color: #999;
            float: right;
            font-size: 24px;
            font-weight: bold;
          }

          .tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 15px;
          }

          .tab {
            flex: 1;
            background-color: white;
            color: #666;
            border: 1px solid #ddd;
            padding: 10px;
            font-size: 14px;
            font-weight: bold;
          }

          .tab.active {
            background-color: #007bff;
            color: white;
            border-color: #007bff;
          }

          .follow-btn {
            padding: 4px 10px;
            font-size: 12px;
            background-color: #007bff;
            color: white;
            align-self: center;
          }

          .follow-btn.following {
            background-color: transparent;
            color: #666;
            border: 1px solid #ddd;
          }

          .action-btn.active-like {
            color: #e67e22;
            border-color: #e67e22;
          }

          .action-btn.active-repost {
            color: #28a745;
            border-color: #28a745;
          }

          .action-btn:disabled {
            cursor: not-allowed;
            opacity: 0.5;
          }

          .empty-state {
            text-align: center;
            color: #999;
            padding: 40px 20px;
          }

          .comment-section {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #eee;
          }

          .comment-item {
            display: flex;
            gap: 8px;
            padding: 8px 0;
          }

          .comment-form {
            margin-top: 10px;
          }

          .comment-form textarea {
            width: 100%;
            margin-bottom: 8px;
          }
        `}</style>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
