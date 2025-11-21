import { Editor } from '@tinymce/tinymce-react';
import React from 'react';

interface TinyEditorProps {
  value: string;
  onChange: (content: string) => void;
}

const TinyEditor: React.FC<TinyEditorProps> = ({ value, onChange }) => {
  return (
    <Editor
      apiKey="ioemqkqfxeolzsu58d22j5tpa9o9xc3jo9wm5qffdxzo2htr"
      value={value}
      onEditorChange={onChange}
      init={{
        height: 600,
        menubar: true,
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'insertdatetime', 'media', 'table', 'help', 'wordcount'
        ],
        toolbar: 'undo redo | formatselect | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table | code preview fullscreen | help',
        block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Heading 5=h5; Heading 6=h6',
        automatic_uploads: true,
        images_upload_handler: (blobInfo, success, failure) => {
          const base64 = blobInfo.base64();
          const mime = blobInfo.blob().type;
          const dataUrl = `data:${mime};base64,${base64}`;
          success(dataUrl);
        },
        paste_data_images: true,
        branding: false,
        resize: false,
        statusbar: false,
        language: 'pt_BR',
        content_style: `
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #374151;
            margin: 0;
            padding: 10px;
          }
          h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; }
          h2 { font-size: 1.5em; font-weight: bold; margin: 0.75em 0; }
          h3 { font-size: 1.17em; font-weight: bold; margin: 0.83em 0; }
          h4 { font-size: 1em; font-weight: bold; margin: 1.12em 0; }
          h5 { font-size: 0.83em; font-weight: bold; margin: 1.5em 0; }
          h6 { font-size: 0.75em; font-weight: bold; margin: 1.67em 0; }
        `
      }}
    />
  );
};

export default TinyEditor;
