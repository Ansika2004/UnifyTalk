import React from 'react'
import { useParams } from 'react-router-dom'
import FamilyView from '../components/FamilyView'

const FamilyShell: React.FC = () => {
  const { token } = useParams<{ token: string }>()
  return <FamilyView token={token ?? ''} />
}

export default FamilyShell
