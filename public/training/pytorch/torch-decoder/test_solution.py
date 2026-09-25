# Career OS original CPU tests. 本站原创教学补充；本轮未另行指定再分发许可。第三方已有许可不变。
# Save your implementation as solution.py in this directory; run python -m unittest -v.
import math
import unittest
import torch
import torch.nn.functional as F
import solution

torch.set_num_threads(1)

def close(actual, expected):
    torch.testing.assert_close(actual, expected, rtol=1e-9, atol=1e-10)

def rand(*shape):
    return torch.randn(*shape, dtype=torch.float64)


def params(d=8, hidden=12):
    result={name:rand(d,d)*0.2 for name in ('wq','wk','wv','wo')}
    result.update(w1=rand(hidden,d)*0.2,b1=rand(hidden)*0.1,w2=rand(d,hidden)*0.2,b2=rand(d)*0.1)
    result.update(n1w=rand(d),n1b=rand(d),n2w=rand(d),n2b=rand(d))
    return result

def decoder_oracle(x,p,h,valid):
    b,t,d=x.shape
    z=F.layer_norm(x,(d,),p['n1w'],p['n1b'],1e-5)
    q,k,v=[F.linear(z,p[name]).reshape(b,t,h,d//h).transpose(1,2) for name in ('wq','wk','wv')]
    mask=torch.ones(t,t,dtype=torch.bool).tril()[None,None]&valid[:,None,None,:]
    y=F.scaled_dot_product_attention(q,k,v,attn_mask=mask,dropout_p=0.0)
    residual=x+F.linear(y.transpose(1,2).reshape(b,t,d),p['wo'])
    z=F.layer_norm(residual,(d,),p['n2w'],p['n2b'],1e-5)
    return residual+F.linear(F.gelu(F.linear(z,p['w1'],p['b1']),approximate='none'),p['w2'],p['b2'])

class SolutionTests(unittest.TestCase):
    def setUp(self):
        torch.manual_seed(1234)

    def test_numerical_reference_with_causal_and_padding_mask(self):
        x=rand(2,5,8); p=params(); valid=torch.tensor([[True]*5,[True,True,True,False,False]])
        close(solution.decoder_block(x,p,2,valid),decoder_oracle(x,p,2,valid))

    def test_future_tokens_and_padding_do_not_leak(self):
        x=rand(2,5,8); p=params(); valid=torch.tensor([[True]*5,[True,True,True,False,False]])
        expected=solution.decoder_block(x,p,2,valid)
        # Nonuniform feature perturbation survives Pre-LN (a constant shift would not).
        changed=x.clone(); changed[:,3:,0]+=50
        close(solution.decoder_block(changed,p,2,valid)[:,:3],expected[:,:3])
        # An earlier padding key must not affect later, valid query positions.
        valid=torch.tensor([[True,False,True,True,True]]*2)
        expected=solution.decoder_block(x,p,2,valid)
        changed=x.clone(); changed[:,1,0]-=75
        close(solution.decoder_block(changed,p,2,valid)[:,2:],expected[:,2:])

    def test_fully_masked_attention_keeps_residual_and_ffn_finite(self):
        x=rand(1,3,8); p=params(); valid=torch.zeros(1,3,dtype=torch.bool)
        z=F.layer_norm(x,(8,),p['n2w'],p['n2b'],1e-5)
        expected=x+F.linear(F.gelu(F.linear(z,p['w1'],p['b1'])),p['w2'],p['b2'])
        close(solution.decoder_block(x,p,2,valid),expected)

    def test_invalid_heads_and_padding(self):
        with self.assertRaises(ValueError): solution.decoder_block(rand(1,3,8),params(),3)
        with self.assertRaises(ValueError): solution.decoder_block(rand(1,3,8),params(),2,torch.ones(2,3,dtype=torch.bool))


if __name__ == "__main__":
    unittest.main(verbosity=2)
