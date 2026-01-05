import { SignupForm } from '@/components/auth/signup-form'
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import React from 'react'

const SignupPage =  async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/");
  }

  return (
    <>
    <SignupForm />
    </>
  )
}

export default SignupPage
