import React from 'react';
import styled from 'styled-components/macro';

export const Button = styled.button`
  background-color: #e6e6e6;
  border: 1px solid #9e9e9e;
  border-radius: 3px;
  padding: 0.5em 1em;
  box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.2),
    0px -1px 0px rgba(255, 255, 255, 0.4);

  &:hover {
    background-color: #f0f0f0;
  }
`;

function UnstyledEmoji({
  emoji,
  label = 'emoji',
  ...rest
}: { emoji: string; label?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <span role='img' aria-label={label} {...rest}>
      {emoji}
    </span>
  );
}

export const Emoji = styled(UnstyledEmoji)`
  line-height: 1em;
`;
