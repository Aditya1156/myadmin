import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <SignIn
      appearance={{
        elements: {
          socialButtonsBlockButton: { display: 'none' },
          socialButtonsBlockButtonArrow: { display: 'none' },
          dividerRow: { display: 'none' },
          footer: { display: 'none' },
        },
      }}
    />
  );
}
