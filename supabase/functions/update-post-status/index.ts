import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 환경변수 확인 로그
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('SUPABASE_URL exists:', !!supabaseUrl);
    console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!serviceRoleKey);
    console.log('SUPABASE_ANON_KEY exists:', !!anonKey);
    
    // 환경변수 검증
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Required environment variables are missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    
    // Create Supabase client with service role key for admin access (bypasses RLS)
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    
    // 직접 SQL 쿼리 실행
    console.log('Executing status update SQL...');
    
    const { data: progressData, error: progressError } = await supabase
      .from('GamePost')
      .update({ status: 'IN_PROGRESS' })
      .in('status', ['OPEN', 'FULL'])
      .lte('startTime', new Date().toISOString())
      .select('id');
    
    if (progressError) {
      console.error('Progress update error:', progressError);
      throw progressError;
    }
    
    const updatedToProgress = progressData?.length || 0;
    console.log('Updated to IN_PROGRESS:', updatedToProgress);
    
    // 5시간 후 완료 처리
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    const { data: completedData, error: completedError } = await supabase
      .from('GamePost')
      .update({ status: 'COMPLETED' })
      .eq('status', 'IN_PROGRESS')
      .lte('startTime', fiveHoursAgo)
      .select('id');
    
    if (completedError) {
      console.error('Completed update error:', completedError);
      throw completedError;
    }
    
    const updatedToCompleted = completedData?.length || 0;
    console.log('Updated to COMPLETED:', updatedToCompleted);
    
    const result = {
      message: 'Status update successful',
      updatedToInProgress: updatedToProgress,
      updatedToCompleted: updatedToCompleted
    };
    
    console.log('SQL execution result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
